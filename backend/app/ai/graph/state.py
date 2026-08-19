from typing import TypedDict, List, Dict, Any, Optional

class ProductState(TypedDict, total=False):
    # Inputs
    query: str
    input_product_name: Optional[str]
    input_model: Optional[str]
    input_mpn: Optional[str]
    input_url: Optional[str]
    input_file_path: Optional[str]
    text: Optional[str]
    analysis_job_id: str

    # Agent 1 Output
    product_identity: Dict[str, Any]

    # Search & Discovery
    generated_queries: List[str]
    raw_search_results: List[Dict[str, Any]]
    ranked_sources: List[Dict[str, Any]]
    collected_documents: List[Dict[str, Any]]
    parsed_documents: List[Dict[str, Any]]

    # Agent 2 Extraction & Validation
    extracted_attributes_by_source: List[Dict[str, Any]]
    normalized_attributes: List[Dict[str, Any]]
    validated_attributes: List[Dict[str, Any]]
    conflicts: List[Dict[str, Any]]
    resolved_attributes: List[Dict[str, Any]]

    # Enrichment & Re-validation
    enriched_attributes: List[Dict[str, Any]]
    revalidated_attributes: List[Dict[str, Any]]
    commerce_metadata: Dict[str, Any]

    # Agent 3 Confidence & Output
    confidence_scores: Dict[str, Any]
    final_product: Dict[str, Any]

    # Job tracking
    progress: int
    current_node: str
    status_message: str
    error_message: Optional[str]
