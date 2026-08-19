from app.services.validation import ValidationEngine
from app.schemas.product import ProductAttributeSchema

def test_rule_based_validation_valid():
    attr = ProductAttributeSchema(
        attribute_name="Battery",
        value="4000 mAh",
        normalized_value={"value": 4000, "unit": "mAh"},
        unit="mAh"
    )
    is_valid, msg = ValidationEngine.validate_rule_based(attr)
    assert is_valid is True
    assert msg is None


def test_rule_based_validation_invalid_negative():
    attr = ProductAttributeSchema(
        attribute_name="Weight",
        value="-150 g",
        normalized_value={"value": -150, "unit": "g"},
        unit="g"
    )
    is_valid, msg = ValidationEngine.validate_rule_based(attr)
    assert is_valid is False
    assert "Rule Violation" in msg


def test_cross_source_validation_agreement():
    extracted = [
        {
            "source_name": "Official Site",
            "source_type": "MANUFACTURER_PAGE",
            "authority_score": 0.99,
            "attributes": [{"attribute_name": "Battery", "value": "4000 mAh"}]
        },
        {
            "source_name": "Tech Manual",
            "source_type": "MANUFACTURER_TECH_DOC",
            "authority_score": 0.98,
            "attributes": [{"attribute_name": "Battery", "value": "4000mAh"}]
        }
    ]
    validated, conflicts = ValidationEngine.perform_cross_source_validation(extracted)
    assert len(validated) == 1
    assert validated[0].verification_status == "VERIFIED"
    assert len(conflicts) == 0


def test_cross_source_validation_conflict():
    extracted = [
        {
            "source_name": "Official Site",
            "source_type": "MANUFACTURER_PAGE",
            "authority_score": 0.99,
            "attributes": [{"attribute_name": "Battery", "value": "4000 mAh"}]
        },
        {
            "source_name": "Third-party Catalog",
            "source_type": "OTHER_CATALOG",
            "authority_score": 0.60,
            "attributes": [{"attribute_name": "Battery", "value": "3900 mAh"}]
        }
    ]
    validated, conflicts = ValidationEngine.perform_cross_source_validation(extracted)
    assert len(conflicts) == 1
    assert conflicts[0].attribute_name == "Battery"
    assert conflicts[0].conflict_type == "VALUE_CONFLICT"
