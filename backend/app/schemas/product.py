from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# --- Product Identity Schemas ---
class ProductIdentity(BaseModel):
    brand: Optional[str] = None
    product_name: str
    model: Optional[str] = None
    mpn: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    variant: Optional[str] = None
    identity_confidence: float = 0.0
    identity_status: str = "UNVERIFIED"  # VERIFIED, NEEDS_REVIEW


# --- Attribute Schema ---
class NormalizedValue(BaseModel):
    value: Optional[Any] = None
    unit: Optional[str] = None


class ProductAttributeSchema(BaseModel):
    id: Optional[str] = None
    attribute_name: str
    category: str = "General"
    value: Optional[str] = None
    normalized_value: Optional[NormalizedValue] = None
    unit: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_type: Optional[str] = "UNKNOWN_WEBSITE"
    evidence_snippet: Optional[str] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    confidence: float = 0.0
    confidence_reason: Optional[str] = None
    verification_status: str = "UNVERIFIED"  # VERIFIED, CONFLICT, AI_INFERRED, ENRICHED, NEEDS_REVIEW, UNVERIFIED
    extraction_method: str = "DIRECT_EXTRACTION"
    last_verified_at: Optional[datetime] = None


# --- Source Schema ---
class SourceSchema(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    domain: Optional[str] = None
    source_type: str = "UNKNOWN_WEBSITE"
    authority_score: float = 0.5
    is_official: bool = False
    attributes_extracted_count: int = 0
    retrieved_at: Optional[datetime] = None


# --- Conflict Schema ---
class CompetingValue(BaseModel):
    source_name: str
    source_url: Optional[str] = None
    source_type: str
    authority_score: float
    value: str
    evidence_snippet: Optional[str] = None


class ConflictSchema(BaseModel):
    id: Optional[str] = None
    attribute_name: str
    conflict_type: str = "VALUE_CONFLICT"  # VALUE_CONFLICT, IDENTITY_CONFLICT, CONTEXT_CONFLICT
    competing_values: List[CompetingValue] = []
    resolution_status: str = "UNRESOLVED"  # RESOLVED, UNRESOLVED, NEEDS_HUMAN_REVIEW
    resolved_value: Optional[str] = None
    resolution_reason: Optional[str] = None


# --- Enrichment Commerce Content Schema ---
class CommerceMetadata(BaseModel):
    marketing_title: Optional[str] = None
    short_description: Optional[str] = None
    feature_bullets: List[str] = []
    search_keywords: List[str] = []
    technical_summary: Optional[str] = None


# --- Full Product Schema ---
class ProductSchema(BaseModel):
    id: str
    identity: ProductIdentity
    attributes: List[ProductAttributeSchema] = []
    sources: List[SourceSchema] = []
    conflicts: List[ConflictSchema] = []
    commerce_metadata: Optional[CommerceMetadata] = None
    created_at: datetime
    updated_at: datetime


# --- Analysis Request & Job Schemas ---
class AnalysisRequest(BaseModel):
    product_name: Optional[str] = None
    model: Optional[str] = None
    mpn: Optional[str] = None
    url: Optional[str] = None
    text: Optional[str] = None
    description: Optional[str] = None


class AnalysisEventSchema(BaseModel):
    node_name: str
    status: str  # INFO, SUCCESS, WARNING, ERROR
    message: str
    timestamp: datetime


class AnalysisJobStatus(BaseModel):
    job_id: str
    product_id: Optional[str] = None
    status: str  # QUEUED, RUNNING, COMPLETED, FAILED
    current_node: str
    progress: int
    message: str
    error_message: Optional[str] = None
    events: List[AnalysisEventSchema] = []
    result_summary: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# --- Standard API Response wrappers ---
class APIResponse(BaseModel):
    data: Any
    meta: Dict[str, Any] = Field(default_factory=dict)


class APIErrorDetails(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class APIErrorResponse(BaseModel):
    error: APIErrorDetails
