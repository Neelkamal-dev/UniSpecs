from typing import List, Dict, Any, Tuple, Optional
from app.schemas.product import ProductAttributeSchema, ConflictSchema, CompetingValue
from app.services.normalization import NormalizationEngine

class ValidationEngine:
    """
    Two-layer validation engine:
    Layer 1: Rule-Based Validation (physical bounds, unit sanity, numeric checks)
    Layer 2: Cross-Source Validation (identifying value, identity & context conflicts across independent sources)
    """

    @staticmethod
    def validate_rule_based(attribute: ProductAttributeSchema) -> Tuple[bool, Optional[str]]:
        """
        Layer 1: Rule-Based Validation.
        Returns (is_valid, validation_error_message).
        """
        if not attribute.value:
            return True, None

        val_str = str(attribute.value).strip()
        norm = attribute.normalized_value or {}

        # 1. Physical sanity checks
        val = None
        unit = None

        if isinstance(norm, dict):
            val = norm.get("value")
            unit = norm.get("unit")
        elif hasattr(norm, "value"):
            val = getattr(norm, "value")
            unit = getattr(norm, "unit", None)

        if val is not None and isinstance(val, (int, float)):
            if val <= 0 and attribute.attribute_name.lower() in ["battery", "weight", "ram", "storage", "power", "display"]:
                return False, f"Rule Violation: {attribute.attribute_name} must be greater than zero."
            
            if attribute.attribute_name.lower() in ["battery", "battery capacity"] and unit == "mAh" and val > 100000:
                return False, f"Rule Violation: Unreasonable battery capacity value ({val} mAh)."

            if attribute.attribute_name.lower() in ["ram", "memory"] and unit == "GB" and val > 2048:
                return False, f"Rule Violation: Unreasonable RAM size ({val} GB)."

        return True, None

    @staticmethod
    def perform_cross_source_validation(
        extracted_attributes_by_source: List[Dict[str, Any]]
    ) -> Tuple[List[ProductAttributeSchema], List[ConflictSchema]]:
        """
        Layer 2: Cross-Source Validation.
        Aggregates attributes across sources, compares normalized values, and flags conflicts.
        """
        attribute_map: Dict[str, List[Dict[str, Any]]] = {}

        # 1. Group extracted items by attribute_name
        for src_entry in extracted_attributes_by_source:
            source_name = src_entry.get("source_name", "Unknown Source")
            source_url = src_entry.get("source_url")
            source_type = src_entry.get("source_type", "UNKNOWN_WEBSITE")
            authority_score = src_entry.get("authority_score", 0.5)
            attrs = src_entry.get("attributes", [])

            for attr in attrs:
                aname = attr.get("attribute_name")
                if not aname:
                    continue
                
                key = aname.strip().lower()
                if key not in attribute_map:
                    attribute_map[key] = []
                
                attribute_map[key].append({
                    "raw_attribute": attr,
                    "source_name": source_name,
                    "source_url": source_url,
                    "source_type": source_type,
                    "authority_score": authority_score
                })

        validated_attributes: List[ProductAttributeSchema] = []
        conflicts: List[ConflictSchema] = []

        # 2. Process each attribute group
        for key, occurrences in attribute_map.items():
            first_raw = occurrences[0]["raw_attribute"]
            attr_name = first_raw.get("attribute_name", key.capitalize())
            category = first_raw.get("category", "General")

            # Extract distinct normalized values
            distinct_values: Dict[str, List[Dict[str, Any]]] = {}

            for occ in occurrences:
                raw_val = occ["raw_attribute"].get("value")
                if not raw_val:
                    continue
                
                norm_dict, standard_unit = NormalizationEngine.normalize_attribute(attr_name, raw_val)
                norm_key = str(norm_dict) if norm_dict else str(raw_val).strip().lower()

                if norm_key not in distinct_values:
                    distinct_values[norm_key] = []
                
                distinct_values[norm_key].append({
                    "occ": occ,
                    "raw_val": raw_val,
                    "norm_dict": norm_dict,
                    "unit": standard_unit
                })

            if not distinct_values:
                continue

            # Check if there is agreement or conflict
            if len(distinct_values) == 1:
                # Single consensus value
                norm_key = list(distinct_values.keys())[0]
                sample = distinct_values[norm_key][0]
                occ = sample["occ"]
                raw_attr = occ["raw_attribute"]

                # Aggregate sources
                sources_agree_count = len(distinct_values[norm_key])
                highest_auth = max(item["occ"]["authority_score"] for item in distinct_values[norm_key])
                
                validated_attr = ProductAttributeSchema(
                    attribute_name=attr_name,
                    category=category,
                    value=sample["raw_val"],
                    normalized_value=sample["norm_dict"],
                    unit=sample["unit"],
                    source_name=occ["source_name"],
                    source_url=occ["source_url"],
                    source_type=occ["source_type"],
                    evidence_snippet=raw_attr.get("evidence_snippet"),
                    page_number=raw_attr.get("page_number"),
                    section=raw_attr.get("section"),
                    confidence=min(0.99, 0.70 + (0.10 * sources_agree_count) + (0.15 * highest_auth)),
                    confidence_reason=f"Supported by {sources_agree_count} independent source(s). Highest source authority: {highest_auth:.2f}.",
                    verification_status="VERIFIED",
                    extraction_method="CROSS_SOURCE_VALIDATED"
                )
                validated_attributes.append(validated_attr)

            else:
                # Multiple distinct values -> Conflict Detected!
                competing: List[CompetingValue] = []

                for norm_key, items in distinct_values.items():
                    for item in items:
                        occ = item["occ"]
                        raw_attr = occ["raw_attribute"]
                        competing.append(CompetingValue(
                            source_name=occ["source_name"],
                            source_url=occ["source_url"],
                            source_type=occ["source_type"],
                            authority_score=occ["authority_score"],
                            value=str(item["raw_val"]),
                            evidence_snippet=raw_attr.get("evidence_snippet")
                        ))

                # Determine if conflict is Context-Aware (e.g. AC vs DC, different temperatures)
                conflict_type = ValidationEngine._classify_conflict_type(attr_name, competing)

                conflicts.append(ConflictSchema(
                    attribute_name=attr_name,
                    conflict_type=conflict_type,
                    competing_values=competing,
                    resolution_status="UNRESOLVED"
                ))

                # Add unverified attribute entry placeholder flagged with CONFLICT
                highest_auth_occ = max(occurrences, key=lambda x: x["authority_score"])
                raw_attr = highest_auth_occ["raw_attribute"]
                norm_dict, standard_unit = NormalizationEngine.normalize_attribute(attr_name, raw_attr.get("value"))

                validated_attributes.append(ProductAttributeSchema(
                    attribute_name=attr_name,
                    category=category,
                    value=raw_attr.get("value"),
                    normalized_value=norm_dict,
                    unit=standard_unit,
                    source_name=highest_auth_occ["source_name"],
                    source_url=highest_auth_occ["source_url"],
                    source_type=highest_auth_occ["source_type"],
                    evidence_snippet=raw_attr.get("evidence_snippet"),
                    confidence=0.50,
                    confidence_reason=f"Conflicting values detected across {len(competing)} sources.",
                    verification_status="CONFLICT",
                    extraction_method="CONFLICT_DETECTED"
                ))

        return validated_attributes, conflicts

    @staticmethod
    def _classify_conflict_type(attribute_name: str, competing: List[CompetingValue]) -> str:
        """
        Classifies whether conflict is a simple VALUE_CONFLICT or a CONTEXT_CONFLICT.
        Context conflicts happen when values differ due to operating conditions (AC/DC, temp, load).
        """
        combined_evidence = " ".join([c.evidence_snippet or "" for c in competing]).lower()
        context_keywords = ["ac", "dc", "operating temperature", "load", "standby", "peak", "continuous", "boost", "us", "global", "eu"]

        if any(kw in combined_evidence for kw in context_keywords):
            return "CONTEXT_CONFLICT"
        
        return "VALUE_CONFLICT"
