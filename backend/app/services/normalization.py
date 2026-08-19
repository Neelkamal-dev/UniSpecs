import re
from typing import Optional, Dict, Any, Tuple

class NormalizationEngine:
    """
    Normalizes equivalent technical attribute representations into standardized value + unit structures
    without altering technical meaning. Preserves original raw strings as evidence.
    """

    @staticmethod
    def normalize_attribute(attribute_name: str, raw_value: Optional[str]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Returns (normalized_dict, standard_unit_str).
        normalized_dict example: {"value": 8, "unit": "GB"} or {"value": [162.3, 79.0, 8.6], "unit": "mm"}
        """
        if not raw_value or not isinstance(raw_value, str):
            return None, None

        cleaned = raw_value.strip()
        attr_lower = attribute_name.lower()

        # 1. RAM / Storage (GB, MB, TB)
        if any(kw in attr_lower for kw in ["ram", "storage", "memory", "rom", "capacity"]):
            norm = NormalizationEngine._normalize_digital_storage(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 2. Battery (mAh, Wh, Ah)
        if any(kw in attr_lower for kw in ["battery", "accumulator", "mah"]):
            norm = NormalizationEngine._normalize_battery(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 3. Weight / Mass (g, kg, oz, lbs)
        if any(kw in attr_lower for kw in ["weight", "mass"]):
            norm = NormalizationEngine._normalize_weight(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 4. Dimensions / Size (mm, cm, in)
        if any(kw in attr_lower for kw in ["dimension", "dimensions", "size"]):
            norm = NormalizationEngine._normalize_dimensions(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 5. Electrical Current (A, mA)
        if any(kw in attr_lower for kw in ["current", "amperage"]) or (cleaned.endswith("A") and re.search(r'\d+\s*A', cleaned)):
            norm = NormalizationEngine._normalize_current(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 6. Voltage (V, mV, kV)
        if any(kw in attr_lower for kw in ["voltage", "volts"]) or re.search(r'\d+\s*V\b', cleaned):
            norm = NormalizationEngine._normalize_voltage(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 7. Power (W, kW, mW)
        if any(kw in attr_lower for kw in ["power", "wattage", "charging"]):
            norm = NormalizationEngine._normalize_power(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 8. Frequency / Clock speed (GHz, MHz, Hz)
        if any(kw in attr_lower for kw in ["frequency", "clock", "speed", "refresh rate"]):
            norm = NormalizationEngine._normalize_frequency(cleaned)
            if norm:
                return norm, norm.get("unit")

        # 9. Generic Numeric extraction fallback
        num_match = re.search(r'^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z°%]+)?$', cleaned)
        if num_match:
            val = float(num_match.group(1)) if '.' in num_match.group(1) else int(num_match.group(1))
            unit = num_match.group(2) if num_match.group(2) else None
            return {"value": val, "unit": unit}, unit

        return {"value": cleaned, "unit": None}, None

    @staticmethod
    def _normalize_digital_storage(val_str: str) -> Optional[Dict[str, Any]]:
        # Match e.g. "8GB", "8 GB", "8 gigabytes", "512 MB", "1 TB"
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(tb|terabytes?|gb|gigabytes?|mb|megabytes?)\b', val_str, re.IGNORECASE)
        if match:
            num = float(match.group(1)) if '.' in match.group(1) else int(match.group(1))
            unit_raw = match.group(2).upper()
            if "TB" in unit_raw:
                return {"value": num, "unit": "TB"}
            elif "MB" in unit_raw:
                return {"value": num, "unit": "MB"}
            else:
                return {"value": num, "unit": "GB"}
        return None

    @staticmethod
    def _normalize_battery(val_str: str) -> Optional[Dict[str, Any]]:
        # Match "4000mAh", "4,000 mAh", "4000 mAh", "15.4 Wh"
        cleaned_str = val_str.replace(',', '')
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(mah|wh|ah)\b', cleaned_str, re.IGNORECASE)
        if match:
            num = float(match.group(1)) if '.' in match.group(1) else int(match.group(1))
            unit = match.group(2).lower()
            if unit == "mah":
                return {"value": num, "unit": "mAh"}
            elif unit == "wh":
                return {"value": num, "unit": "Wh"}
            elif unit == "ah":
                return {"value": num * 1000, "unit": "mAh"}
        return None

    @staticmethod
    def _normalize_weight(val_str: str) -> Optional[Dict[str, Any]]:
        # Match "167 g", "0.167 kg", "5.89 oz"
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(g|grams?|kg|kilograms?|oz|ounces?|lbs?)\b', val_str, re.IGNORECASE)
        if match:
            num = float(match.group(1))
            unit_raw = match.group(2).lower()
            if unit_raw.startswith("kg"):
                return {"value": round(num * 1000, 2), "unit": "g"}
            elif unit_raw.startswith("g"):
                return {"value": round(num, 2), "unit": "g"}
            elif unit_raw.startswith("oz"):
                return {"value": round(num * 28.3495, 2), "unit": "g"}
            elif unit_raw.startswith("lb"):
                return {"value": round(num * 453.592, 2), "unit": "g"}
        return None

    @staticmethod
    def _normalize_dimensions(val_str: str) -> Optional[Dict[str, Any]]:
        # Match e.g. "147 x 70.6 x 7.6 mm" or "147mm x 70.6mm x 7.6mm"
        cleaned = val_str.replace('×', 'x')
        matches = re.findall(r'([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|in|inches)?', cleaned, re.IGNORECASE)
        if len(matches) >= 2:
            nums = [float(m[0]) for m in matches if m[0]]
            units = [m[1].lower() for m in matches if m[1]]
            unit = units[0] if units else "mm"
            if unit in ["cm", "centimeters"]:
                nums = [round(n * 10, 2) for n in nums]
                unit = "mm"
            elif unit in ["in", "inches"]:
                nums = [round(n * 25.4, 2) for n in nums]
                unit = "mm"
            return {"value": nums, "unit": unit}
        return None

    @staticmethod
    def _normalize_current(val_str: str) -> Optional[Dict[str, Any]]:
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(a|amps?|amperes?|ma|milliamps?)\b', val_str, re.IGNORECASE)
        if match:
            num = float(match.group(1))
            unit = match.group(2).lower()
            if unit.startswith("ma"):
                return {"value": num, "unit": "mA"}
            else:
                return {"value": num, "unit": "A"}
        return None

    @staticmethod
    def _normalize_voltage(val_str: str) -> Optional[Dict[str, Any]]:
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(v|volts?|mv)\b', val_str, re.IGNORECASE)
        if match:
            num = float(match.group(1))
            unit = match.group(2).lower()
            if unit == "mv":
                return {"value": num, "unit": "mV"}
            else:
                return {"value": num, "unit": "V"}
        return None

    @staticmethod
    def _normalize_power(val_str: str) -> Optional[Dict[str, Any]]:
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(w|watts?|kw)\b', val_str, re.IGNORECASE)
        if match:
            num = float(match.group(1))
            unit = match.group(2).lower()
            if unit == "kw":
                return {"value": num * 1000, "unit": "W"}
            else:
                return {"value": num, "unit": "W"}
        return None

    @staticmethod
    def _normalize_frequency(val_str: str) -> Optional[Dict[str, Any]]:
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(ghz|mhz|hz)\b', val_str, re.IGNORECASE)
        if match:
            num = float(match.group(1))
            unit = match.group(2).upper()
            return {"value": num, "unit": unit}
        return None
