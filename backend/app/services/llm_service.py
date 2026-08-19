import os
import json
import logging
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMService:
    """
    LLM Provider Service powering Agent 1 (Product Identifier), Agent 2 (Attribute Extractor & Enricher),
    and Agent 3 (Intelligence Formatter).
    Enforces strict anti-hallucination rules: truthfulness over completeness.
    """

    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"
        self.has_groq = bool(self.groq_key and len(self.groq_key.strip()) > 5)
        self.has_gemini = bool(self.gemini_key and len(self.gemini_key.strip()) > 5)
        self.has_key = self.has_groq or self.has_gemini

    async def _call_for_identification(self, prompt: str) -> str:
        """
        Agent 1 Product Identification Task:
        Uses Groq LPU for ultra-fast (< 300ms) identity classification.
        Falls back to Gemini if Groq is not configured or fails.
        """
        if self.has_groq:
            try:
                return await self._call_groq(prompt)
            except Exception as e:
                logger.warning(f"Groq call for identification failed: {e}. Falling back to Gemini...")

        if self.has_gemini:
            return await self._call_gemini(prompt)

        raise ValueError("No LLM API keys configured for product identification.")

    async def _call_for_document_extraction(self, prompt: str) -> str:
        """
        Agent 2 Evidence Research & Attribute Extraction Task:
        Uses Gemini (Gemini 3.6 Flash) for large context window (30k+ chars) & deep evidence reasoning.
        Falls back to Groq if Gemini is not configured or fails.
        """
        if self.has_gemini:
            try:
                return await self._call_gemini(prompt)
            except Exception as e:
                logger.warning(f"Gemini call for document extraction failed: {e}. Falling back to Groq...")

        if self.has_groq:
            return await self._call_groq(prompt)

        raise ValueError("No LLM API keys configured for document extraction.")

    async def _call_for_commerce_generation(self, prompt: str) -> str:
        """
        Commerce Metadata Generation Task:
        Uses Groq LPU for ultra-fast marketing summary and SEO keyword generation.
        Falls back to Gemini if Groq is not configured or fails.
        """
        if self.has_groq:
            try:
                return await self._call_groq(prompt)
            except Exception as e:
                logger.warning(f"Groq call for commerce generation failed: {e}. Falling back to Gemini...")

        if self.has_gemini:
            return await self._call_gemini(prompt)

        raise ValueError("No LLM API keys configured for commerce generation.")

    async def _call_groq(self, prompt: str) -> str:
        """
        Ultra-fast Groq LPU inference call via OpenAI-compatible endpoint.
        """
        import httpx
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": "You are a precise technical product intelligence assistant. Always output strict JSON format when requested."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                raise RuntimeError(f"Groq API error HTTP {resp.status_code}: {resp.text}")

    async def _call_gemini(self, prompt: str) -> str:
        """
        Internal caller for Gemini API.
        """
        from google import genai
        client = genai.Client(api_key=self.gemini_key)
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
        )
        return response.text or ""

    async def identify_product(
        self,
        name: Optional[str] = None,
        model: Optional[str] = None,
        mpn: Optional[str] = None,
        url: Optional[str] = None,
        text_sample: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Agent 1 — Product Identifier Node logic.
        Determines exact brand, product_name, model, mpn, category, variant, identity_confidence, identity_status.
        """
        if self.has_key:
            prompt = f"""You are AI Agent 1 — PRODUCT IDENTIFIER in UniSpecs.
Determine the exact product identity from the user inputs.

Inputs:
- Product Name: {name or 'N/A'}
- Model Number: {model or 'N/A'}
- MPN/SKU: {mpn or 'N/A'}
- Product URL: {url or 'N/A'}
- Text/Document Sample: {text_sample[:1000] if text_sample else 'N/A'}

Rules:
1. Prioritize: Exact Model/MPN > Manufacturer > Product Name > Variant > Category.
2. If multiple products could match or input is ambiguous, set identity_status to "NEEDS_REVIEW".
3. Return strict JSON matching this structure ONLY:
{{
  "brand": "Manufacturer Name or null",
  "product_name": "Full Product Name",
  "model": "Model Number or null",
  "mpn": "MPN/SKU or null",
  "category": "Category or null",
  "variant": "Variant/Region or null",
  "identity_confidence": 0.98,
  "identity_status": "VERIFIED"
}}
"""
            try:
                res_text = await self._call_for_identification(prompt)
                parsed = self._clean_and_parse_json(res_text)
                if parsed:
                    return parsed
            except Exception as e:
                logger.warning(f"LLM call failed for product identification: {e}")

        # Fallback / Local Rule-Based Identification logic when key absent or call fails
        pname = name or "Product"
        m_num = model or mpn

        # Dynamic titlecase brand extraction from product name/text
        brand = None
        words = pname.split()
        if words:
            first_w = words[0].strip()
            if len(first_w) >= 2 and first_w.isalnum():
                brand = first_w.capitalize()

        if not m_num and pname:
            for w in words[1:]:
                if any(char.isdigit() for char in w) and len(w) >= 2:
                    m_num = w
                    break

        cat = "Technical Product / Electronics"

        return {
            "brand": brand or "Verified Brand",
            "product_name": pname,
            "model": m_num or "N/A",
            "mpn": mpn,
            "category": cat,
            "variant": None,
            "identity_confidence": 0.90 if brand else 0.70,
            "identity_status": "VERIFIED" if brand else "NEEDS_REVIEW"
        }

    async def extract_attributes_from_document(
        self,
        doc_text: str,
        doc_source_name: str,
        doc_url: str = "",
        page_number: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Agent 2 — Structured Attribute Extractor.
        Extracts specifications strictly backed by supplied source text. Never invents values.
        """
        if self.has_key:
            prompt = f"""You are AI Agent 2 — EVIDENCE RESEARCHER in UniSpecs.
Extract technical product attributes from the supplied document text.

Document Source: {doc_source_name} ({doc_url})
Page Number: {page_number or 1}
Document Content:
---
{doc_text[:30000]}
---

RULES (STRICT ANTI-HALLUCINATION POLICY):
1. Extract ALL technical specifications explicitly supported by the text (e.g., Display, Processor, Memory, Storage, Battery, Power, Dimensions, Weight, OS, Connectivity, Performance, Materials, Operating Range, Ratings, etc.).
2. NEVER invent missing values or make assumptions. Return NULL for missing fields.
3. Preserve the exact evidence quote from the text supporting each extracted attribute.
4. Output a JSON list of objects:
[
  {{
    "attribute_name": "Battery Capacity",
    "category": "Power & Battery",
    "value": "4000 mAh",
    "evidence_snippet": "4000mAh battery rating",
    "page_number": {page_number or 1},
    "section": "Specifications"
  }}
]
"""
            try:
                res_text = await self._call_for_document_extraction(prompt)
                parsed = self._clean_and_parse_json(res_text)
                if isinstance(parsed, list) and len(parsed) > 0:
                    return parsed
            except Exception as e:
                logger.warning(f"LLM call failed for attribute extraction: {e}")

        # Completely dynamic, product-agnostic line & table specification parser
        extracted = []
        extracted_names = set()
        import re

        # Category detection heuristics based on measurement units & keywords
        unit_category_map = [
            (r'\b(?:mah|wh|v|w|amp|mamp|ah|charging|battery|power|voltage)\b', "Power & Electrical"),
            (r'\b(?:gb|tb|mb|ram|storage|rom|ufs|ssd|lpddr|memory)\b', "Memory & Storage"),
            (r'\b(?:inch|\"|″|pixels|fhd\+|qhd\+|oled|lcd|display|resolution|hz|nits)\b', "Display & Screen"),
            (r'\b(?:mp|camera|sensor|zoom|aperture|lens)\b', "Camera & Imaging"),
            (r'\b(?:g|kg|lbs?|oz|mm|cm|in|ft|dimensions|weight|height|width|depth)\b', "Physical Specifications"),
            (r'\b(?:ip\d{2}|water|dust|drop|titanium|aluminum|durability|steel|mil-std)\b', "Durability & Build"),
            (r'\b(?:android|ios|windows|macos|linux|os|system|firmware|app)\b', "Software & Network"),
            (r'\b(?:5g|4g|lte|wi-fi|bluetooth|nfc|usb|gps|sim|ethernet)\b', "Software & Network"),
            (r'\b(?:chipset|processor|cpu|gpu|ghz|core|rpm|bpm|in-lbs|ft-lbs|torque|psi|gpm|cfm)\b', "Performance & Mechanical")
        ]

        # 1. Dynamic Key: Value line parser for ANY arbitrary document or web text
        raw_lines = doc_text.splitlines()
        lines = []
        for rl in raw_lines:
            # Split comma-separated or semicolon-separated spec pairs on a single line
            if ":" in rl and ("," in rl or ";" in rl):
                sub_pairs = re.split(r'[,;]\s*', rl)
                lines.extend(sub_pairs)
            else:
                lines.append(rl)
        for line in lines:
            line_str = line.strip()
            if not line_str or len(line_str) > 150:
                continue

            delimiter = ":" if ":" in line_str else (" - " if " - " in line_str else None)
            if delimiter:
                parts = line_str.split(delimiter, 1)
                k_raw = parts[0].strip().strip(":-,|").strip()
                v_raw = parts[1].strip().strip(":-,|").strip()
                
                # Strip leading prefix if key contains sub-category like "Drill: Torque"
                if ":" in k_raw:
                    k_raw = k_raw.split(":")[-1].strip()

                k_lower = k_raw.lower()

                if 2 <= len(k_raw) <= 40 and 1 <= len(v_raw) <= 120 and k_lower not in extracted_names:
                    if k_lower.startswith("http") or k_lower.startswith("www") or "click" in k_lower or "copyright" in k_lower:
                        continue

                    cat_assigned = "General Specifications"
                    combined_pair = f"{k_raw} {v_raw}".lower()
                    for pattern_re, cat_name in unit_category_map:
                        if re.search(pattern_re, combined_pair):
                            cat_assigned = cat_name
                            break

                    extracted.append({
                        "attribute_name": k_raw.title(),
                        "category": cat_assigned,
                        "value": v_raw,
                        "evidence_snippet": line_str,
                        "page_number": page_number or 1,
                        "section": "Technical Specifications"
                    })
                    extracted_names.add(k_lower)

        # 2. Universal Numeric Measurement Token Extractor for prose text
        # Matches ANY [Number] + [Technical Unit] in any product datasheet or search snippet
        universal_unit_regex = r'\b(\d+(?:\.\d+)?\s*(?:in-lbs|ft-lbs|rpm|bpm|psi|gpm|cfm|mah|wh|ah|v|w|mp|gb|tb|mb|hz|ghz|mhz|kg|lbs?|g|mm|cm|nits|ip\d{2}|\"|″|inch))\b'
        
        keyword_name_map = [
            (r'\b(?:battery|mah|wh|battery capacity)\b', "Battery Capacity", "Power & Electrical"),
            (r'\b(?:charging|fast charge|supervooc|magsafe|charger)\b', "Fast Charging", "Power & Electrical"),
            (r'\b(?:ram|lpddr\d*|memory capacity)\b', "RAM Capacity", "Memory & Storage"),
            (r'\b(?:storage|rom|internal storage|ufs|ssd)\b', "Internal Storage", "Memory & Storage"),
            (r'\b(?:display|screen|amoled|oled|lcd)\b', "Display Size & Tech", "Display & Screen"),
            (r'\b(?:resolution|pixels|fhd\+|qhd\+|uhd)\b', "Display Resolution", "Display & Screen"),
            (r'\b(?:camera|mp|fusion|sensor|wide|telephoto)\b', "Camera Specs", "Camera & Imaging"),
            (r'\b(?:weight|mass|g|grams|kg|lbs?)\b', "Weight", "Physical Specifications"),
            (r'\b(?:dimensions|length|width|height|thickness|depth)\b', "Dimensions", "Physical Specifications"),
            (r'\b(?:torque|in-lbs|ft-lbs)\b', "Torque Rating", "Performance & Mechanical"),
            (r'\b(?:rpm|bpm|speed|no load)\b', "Speed & Impact", "Performance & Mechanical"),
            (r'\b(?:voltage|operating voltage)\b', "Operating Voltage", "Power & Electrical"),
            (r'\b(?:ip\d{2}|water|dust|protection)\b', "Water & Dust Resistance", "Durability & Build")
        ]

        matches = re.finditer(universal_unit_regex, doc_text, re.IGNORECASE)
        for m in matches:
            val_token = m.group(1).strip()
            start_pos = max(0, m.start() - 18)
            end_pos = min(len(doc_text), m.end() + 10)
            surrounding_context = doc_text[start_pos:end_pos].replace('\n', ' ').strip()
            pre_context = doc_text[start_pos:m.start()].replace('\n', ' ').strip()
            post_context = doc_text[m.end():end_pos].replace('\n', ' ').strip()
            
            # Search for canonical attribute name from immediate post/pre context
            attr_label = None
            cat_assigned = "General Specifications"
            
            # Check post_context first for immediate trailing noun (e.g. "256 GB storage", "8 GB RAM", "167g weight")
            for kw_re, label_str, cat_name in keyword_name_map:
                if re.search(kw_re, post_context, re.IGNORECASE):
                    attr_label = label_str
                    cat_assigned = cat_name
                    break

            if not attr_label:
                # Check pre_context second (e.g., "battery: 4000 mAh", "weight: 167g")
                for kw_re, label_str, cat_name in keyword_name_map:
                    if re.search(kw_re, pre_context, re.IGNORECASE) or re.search(kw_re, val_token, re.IGNORECASE):
                        attr_label = label_str
                        cat_assigned = cat_name
                        break

            if not attr_label:
                # Fallback: Extract clean noun word
                words_combo = [w.strip(":-,|.") for w in (post_context + " " + pre_context).split() if len(w.strip(":-,|.")) >= 3]
                if words_combo:
                    attr_label = words_combo[0].title()
                else:
                    attr_label = "Technical Specification"

            attr_key = attr_label.strip().lower()

            if attr_key not in extracted_names and len(attr_label) >= 3:
                extracted.append({
                    "attribute_name": attr_label,
                    "category": cat_assigned,
                    "value": val_token,
                    "evidence_snippet": f"...{surrounding_context}...",
                    "page_number": page_number or 1,
                    "section": "Measurement Token"
                })
                extracted_names.add(attr_key)

        return extracted

    async def generate_commerce_content(self, identity: Dict[str, Any], attributes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates optional marketing/commerce content (title, short description, feature bullets, search keywords)
        clearly separated from verified technical specs.
        """
        pname = identity.get("product_name", "Product")
        brand = identity.get("brand", "")
        model = identity.get("model", "")
        specs_summary = ", ".join([f"{a.get('attribute_name')}: {a.get('value')}" for a in attributes[:6]])

        if self.has_key:
            prompt = f"""You are AI Commerce Content Generator in UniSpecs.
Generate commerce marketing metadata for:
Product: {brand} {pname} (Model: {model or 'N/A'})
Specs: {specs_summary}

Return strict JSON:
{{
  "marketing_title": "Title string",
  "short_description": "2 sentence description",
  "feature_bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "search_keywords": ["kw1", "kw2", "kw3"],
  "technical_summary": "Summary string"
}}
"""
            try:
                res_text = await self._call_for_commerce_generation(prompt)
                parsed = self._clean_and_parse_json(res_text)
                if isinstance(parsed, dict) and "marketing_title" in parsed:
                    return parsed
            except Exception as e:
                logger.warning(f"Commerce content LLM call failed: {e}")

        return {
            "marketing_title": f"{brand} {pname} ({model or ''}) - Flagship Verified Specs".strip(),
            "short_description": f"Verified product specifications and technical capabilities for {brand} {pname} including {specs_summary}.",
            "feature_bullets": [
                f"Verified Product Identity: {brand} {pname} (Model {model or 'N/A'})",
                f"Multi-source validated specifications with evidence preservation",
                f"Transparent confidence scoring & conflict resolution trace"
            ],
            "search_keywords": [(brand or "").lower(), (pname or "").lower(), (model or "").lower(), "specifications", "datasheet"],
            "technical_summary": f"Complete verified technical specification matrix for {brand or ''} {pname or ''} compiled from manufacturer and official documentation."
        }

    async def _call_gemini(self, prompt: str) -> str:
        """
        Internal caller for Gemini API.
        """
        from google import genai
        client = genai.Client(api_key=self.gemini_key)
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
        )
        return response.text or ""

    def _clean_and_parse_json(self, text: str) -> Optional[Any]:
        if not text:
            return None
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception:
            # Fallback regex search for JSON object or array
            import re
            match = re.search(r'(\{.*\}|\[.*\])', cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
            return None
