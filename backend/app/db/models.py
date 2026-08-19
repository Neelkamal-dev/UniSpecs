import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    brand = Column(String, nullable=True)
    product_name = Column(String, nullable=False)
    model = Column(String, nullable=True)
    mpn = Column(String, nullable=True)
    sku = Column(String, nullable=True)
    category = Column(String, nullable=True)
    variant = Column(String, nullable=True)
    identity_confidence = Column(Float, default=0.0)
    identity_status = Column(String, default="UNVERIFIED")  # VERIFIED, NEEDS_REVIEW
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan")
    sources = relationship("Source", back_populates="product", cascade="all, delete-orphan")
    conflicts = relationship("Conflict", back_populates="product", cascade="all, delete-orphan")
    analysis_jobs = relationship("AnalysisJob", back_populates="product")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    attribute_name = Column(String, nullable=False)
    category = Column(String, default="General")
    value = Column(Text, nullable=True)
    normalized_value = Column(JSON, nullable=True)  # {"value": 4000, "unit": "mAh"}
    unit = Column(String, nullable=True)
    source_name = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    source_type = Column(String, nullable=True)
    evidence_snippet = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    confidence_reason = Column(Text, nullable=True)
    verification_status = Column(String, default="UNVERIFIED")  # VERIFIED, CONFLICT, AI_INFERRED, ENRICHED, NEEDS_REVIEW, UNVERIFIED
    extraction_method = Column(String, default="DIRECT_EXTRACTION")
    last_verified_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="attributes")


class Source(Base):
    __tablename__ = "sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    title = Column(String, nullable=True)
    url = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    source_type = Column(String, default="UNKNOWN_WEBSITE")  # MANUFACTURER_PAGE, MANUFACTURER_TECH_DOC, OFFICIAL_DATASHEET, etc.
    authority_score = Column(Float, default=0.5)
    is_official = Column(Boolean, default=False)
    attributes_extracted_count = Column(Integer, default=0)
    retrieved_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="sources")


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, nullable=True)
    title = Column(String, nullable=True)
    document_type = Column(String, default="HTML")  # PDF, HTML, TXT
    raw_text = Column(Text, nullable=True)
    pages_count = Column(Integer, default=1)
    doc_metadata = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)


class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    attribute_name = Column(String, nullable=False)
    conflict_type = Column(String, default="VALUE_CONFLICT")  # VALUE_CONFLICT, IDENTITY_CONFLICT, CONTEXT_CONFLICT
    competing_values = Column(JSON, default=[])  # list of {"source": ..., "url": ..., "value": ..., "authority": ...}
    resolution_status = Column(String, default="UNRESOLVED")  # RESOLVED, UNRESOLVED, NEEDS_HUMAN_REVIEW
    resolved_value = Column(Text, nullable=True)
    resolution_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="conflicts")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    input_product_name = Column(String, nullable=True)
    input_model = Column(String, nullable=True)
    input_url = Column(String, nullable=True)
    input_file_path = Column(String, nullable=True)
    status = Column(String, default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED
    current_node = Column(String, default="identify_product")
    progress = Column(Integer, default=0)
    message = Column(String, default="Analysis queued")
    error_message = Column(Text, nullable=True)
    result_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    product = relationship("Product", back_populates="analysis_jobs")
    events = relationship("AnalysisEvent", back_populates="job", cascade="all, delete-orphan")


class AnalysisEvent(Base):
    __tablename__ = "analysis_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    job_id = Column(String, ForeignKey("analysis_jobs.id"), nullable=False)
    node_name = Column(String, nullable=False)
    status = Column(String, default="INFO")  # INFO, SUCCESS, WARNING, ERROR
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    job = relationship("AnalysisJob", back_populates="events")
