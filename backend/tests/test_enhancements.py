import pytest
from app.services.document_parser import DocumentParser
from app.services.search_provider import FallbackSearchProvider

def test_is_safe_url_validation():
    # Safe URLs
    assert DocumentParser.is_safe_url("https://www.google.com") is True
    assert DocumentParser.is_safe_url("https://www.samsung.com/global/galaxy/") is True
    
    # Unsafe loopback or private ranges (should return False)
    assert DocumentParser.is_safe_url("http://127.0.0.1") is False
    assert DocumentParser.is_safe_url("http://localhost:8000") is False
    assert DocumentParser.is_safe_url("https://10.0.0.1") is False
    assert DocumentParser.is_safe_url("http://192.168.1.1") is False

def test_brand_aware_domain_classification():
    provider = FallbackSearchProvider()
    
    # Classification with matching brand
    classified_samsung = provider._classify_domain("samsung.com", brand="Samsung")
    assert classified_samsung == "MANUFACTURER_PAGE"
    
    # Classification with mismatching brand should fallback to generic checks
    classified_other = provider._classify_domain("notebookcheck.net", brand="Apple")
    assert classified_other == "REPUTABLE_DATABASE"
    
    # Check that authority scores reflect classification correctly
    score_samsung = provider._score_authority("samsung.com", brand="Samsung")
    assert score_samsung == 0.99
