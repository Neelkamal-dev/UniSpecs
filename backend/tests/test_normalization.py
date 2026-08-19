from app.services.normalization import NormalizationEngine

def test_ram_normalization():
    norm, unit = NormalizationEngine.normalize_attribute("RAM", "8GB")
    assert norm == {"value": 8, "unit": "GB"}
    assert unit == "GB"

    norm2, unit2 = NormalizationEngine.normalize_attribute("Memory", "8 gigabytes")
    assert norm2 == {"value": 8, "unit": "GB"}
    assert unit2 == "GB"


def test_battery_normalization():
    norm, unit = NormalizationEngine.normalize_attribute("Battery Capacity", "4000mAh")
    assert norm == {"value": 4000, "unit": "mAh"}
    assert unit == "mAh"

    norm2, unit2 = NormalizationEngine.normalize_attribute("Battery", "4,000 mAh")
    assert norm2 == {"value": 4000, "unit": "mAh"}


def test_weight_normalization():
    norm, unit = NormalizationEngine.normalize_attribute("Weight", "167 g")
    assert norm == {"value": 167.0, "unit": "g"}
    assert unit == "g"

    norm2, unit2 = NormalizationEngine.normalize_attribute("Weight", "0.167 kg")
    assert norm2 == {"value": 167.0, "unit": "g"}


def test_dimensions_normalization():
    norm, unit = NormalizationEngine.normalize_attribute("Dimensions", "147.0 x 70.6 x 7.6 mm")
    assert norm == {"value": [147.0, 70.6, 7.6], "unit": "mm"}
    assert unit == "mm"
