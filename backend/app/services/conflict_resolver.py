from typing import List, Tuple
from app.schemas.product import ProductAttributeSchema, ConflictSchema

class ConflictResolver:
    """
    Conflict Resolution Engine.
    Resolves conflicts when empirical evidence supports a clear decision (e.g., manufacturer consensus over catalog site).
    If evidence is insufficient or tied, flags for NEEDS_HUMAN_REVIEW rather than making an unsafe assumption.
    """

    @staticmethod
    def resolve_conflicts(
        attributes: List[ProductAttributeSchema],
        conflicts: List[ConflictSchema]
    ) -> Tuple[List[ProductAttributeSchema], List[ConflictSchema]]:
        
        attr_map = {attr.attribute_name.lower(): attr for attr in attributes}
        updated_conflicts: List[ConflictSchema] = []

        for conflict in conflicts:
            key = conflict.attribute_name.lower()
            competing = conflict.competing_values

            if not competing:
                updated_conflicts.append(conflict)
                continue

            # Group values by normalized string
            value_groups = {}
            for item in competing:
                val = item.value.strip()
                if val not in value_groups:
                    value_groups[val] = []
                value_groups[val].append(item)

            # Score each distinct candidate value
            best_val = None
            max_score = -1.0
            second_max_score = -1.0
            best_group = []

            for val, group in value_groups.items():
                # Score = sum of source authority scores + bonus for manufacturer sources
                group_score = 0.0
                for item in group:
                    auth = item.authority_score
                    if item.source_type in ["MANUFACTURER_PAGE", "MANUFACTURER_TECH_DOC", "OFFICIAL_DATASHEET"]:
                        auth += 0.30  # High bonus for manufacturer
                    group_score += auth

                if group_score > max_score:
                    second_max_score = max_score
                    max_score = group_score
                    best_val = val
                    best_group = group
                elif group_score > second_max_score:
                    second_max_score = group_score

            # Resolution criteria: clear score lead (diff >= 0.35) and manufacturer support
            has_mfg_support = any(
                item.source_type in ["MANUFACTURER_PAGE", "MANUFACTURER_TECH_DOC", "OFFICIAL_DATASHEET"]
                for item in best_group
            )
            lead_margin = max_score - second_max_score

            if has_mfg_support and lead_margin >= 0.30:
                # Safe Resolution
                conflict.resolution_status = "RESOLVED"
                conflict.resolved_value = best_val
                
                mfg_sources = [item.source_name for item in best_group if item.source_type.startswith("MANUFACTURER") or "OFFICIAL" in item.source_type]
                reason = (
                    f"Resolved to '{best_val}'. "
                    f"Supported by authoritative manufacturer source(s) ({', '.join(mfg_sources or [best_group[0].source_name])}) "
                    f"with total score lead of {lead_margin:.2f} over alternative claims."
                )
                conflict.resolution_reason = reason

                # Update attribute in main list
                if key in attr_map:
                    attr = attr_map[key]
                    attr.value = best_val
                    attr.verification_status = "VERIFIED"
                    attr.confidence = min(0.98, 0.85 + (0.05 * len(best_group)))
                    attr.confidence_reason = reason
                    attr.source_name = best_group[0].source_name
                    attr.source_url = best_group[0].source_url
                    attr.evidence_snippet = best_group[0].evidence_snippet
            else:
                # Ambiguous Conflict -> Requires Human Review!
                conflict.resolution_status = "NEEDS_HUMAN_REVIEW"
                conflict.resolution_reason = (
                    f"Conflict unresolved: Competing sources have conflicting values ('"
                    + "' vs '".join(value_groups.keys())
                    + f"') without a decisive authority margin (lead margin: {lead_margin:.2f}). Flagged for human review."
                )

                if key in attr_map:
                    attr = attr_map[key]
                    attr.verification_status = "NEEDS_REVIEW"
                    attr.confidence = 0.45
                    attr.confidence_reason = conflict.resolution_reason

            updated_conflicts.append(conflict)

        return list(attr_map.values()), updated_conflicts
