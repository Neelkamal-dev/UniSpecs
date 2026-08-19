from typing import List, Dict, Any, Tuple
from app.schemas.product import ProductAttributeSchema, ProductIdentity

class ConfidenceEngine:
    """
    Transparent & Explainable Confidence Engine.
    Calculates numerical confidence scores and plain-language justifications for each attribute
    and overall product profile.
    """

    @staticmethod
    def calculate_attribute_confidence(
        attribute: ProductAttributeSchema,
        source_authority: float = 0.5,
        is_official: bool = False,
        sources_agree_count: int = 1,
        has_conflict: bool = False,
        is_enriched: bool = False,
        is_inferred: bool = False
    ) -> Tuple[float, str]:
        """
        Derives numerical confidence (0.0 to 1.0) and explainable reason string.
        """
        if is_inferred:
            return 0.60, "AI-Inferred attribute. Derived from context analysis; pending manufacturer empirical confirmation."

        if has_conflict and attribute.verification_status == "NEEDS_REVIEW":
            return 0.45, "Low confidence due to unresolved cross-source conflict. Requires human review."

        base_score = source_authority

        if is_official:
            base_score = max(base_score, 0.95)

        # Agreement bonus
        agreement_bonus = min(0.10, (sources_agree_count - 1) * 0.05)
        
        # Evidence clarity bonus
        evidence_bonus = 0.05 if attribute.evidence_snippet and len(attribute.evidence_snippet) > 10 else 0.0
        page_bonus = 0.03 if attribute.page_number is not None else 0.0

        final_score = min(0.99, round(base_score + agreement_bonus + evidence_bonus + page_bonus, 2))

        reasons = []
        if is_official:
            reasons.append("Supported by official manufacturer documentation.")
        elif source_authority >= 0.85:
            reasons.append("Retrieved from authorized distributor or reputable technical database.")
        else:
            reasons.append(f"Source authority score: {source_authority:.2f}.")

        if sources_agree_count > 1:
            reasons.append(f"Confirmed across {sources_agree_count} independent sources.")

        if attribute.evidence_snippet:
            reasons.append("Direct textual evidence quote preserved.")

        if is_enriched:
            reasons.append("Enriched missing attribute re-validated across web sources.")

        return final_score, " ".join(reasons)

    @staticmethod
    def calculate_product_overall_metrics(
        identity: ProductIdentity,
        attributes: List[ProductAttributeSchema],
        sources_count: int,
        conflicts_count: int
    ) -> Dict[str, Any]:
        """
        Calculates top-level summary metrics for the Product Dashboard overview.
        """
        total_attrs = len(attributes)
        if total_attrs == 0:
            return {
                "identity_confidence": identity.identity_confidence,
                "data_completeness": 0.0,
                "verification_rate": 0.0,
                "verified_attributes_count": 0,
                "conflicts_count": conflicts_count,
                "needs_review_count": 0,
                "missing_attributes_count": 8
            }

        verified_count = sum(1 for a in attributes if a.verification_status == "VERIFIED")
        needs_review_count = sum(1 for a in attributes if a.verification_status == "NEEDS_REVIEW")
        enriched_count = sum(1 for a in attributes if a.verification_status in ["ENRICHED", "AI_INFERRED"])

        # Verification Rate = verified attributes / total extracted attributes
        verification_rate = round((verified_count / total_attrs) * 100, 1)

        # Standard core spec count expected (display, resolution, processor, ram, storage, battery, weight, dimensions)
        expected_core_count = 10
        completeness = round(min(100.0, (total_attrs / expected_core_count) * 100), 1)

        return {
            "identity_confidence": identity.identity_confidence,
            "data_completeness": completeness,
            "verification_rate": verification_rate,
            "verified_attributes_count": verified_count,
            "conflicts_count": conflicts_count,
            "needs_review_count": needs_review_count,
            "missing_attributes_count": max(0, expected_core_count - total_attrs)
        }
