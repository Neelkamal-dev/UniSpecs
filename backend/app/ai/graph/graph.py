import os
import asyncio
import logging
from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from app.ai.graph.state import ProductState
from app.services.llm_service import LLMService
from app.services.search_provider import get_search_provider
from app.services.document_parser import DocumentParser
from app.services.normalization import NormalizationEngine
from app.services.validation import ValidationEngine
from app.services.conflict_resolver import ConflictResolver
from app.services.confidence import ConfidenceEngine
from app.schemas.product import ProductAttributeSchema, ConflictSchema, CompetingValue

logger = logging.getLogger(__name__)
llm_service = LLMService()


# --- GRAPH NODES ---

async def identify_product_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: identify_product")
    pname = state.get("input_product_name")
    model = state.get("input_model")
    mpn = state.get("input_mpn")
    url = state.get("input_url")
    file_path = state.get("input_file_path")

    text_sample = ""
    if file_path and os.path.exists(file_path):
        try:
            parsed = DocumentParser.parse_pdf(file_path)
            text_sample = parsed.get("text", "")[:1000]
        except Exception as e:
            logger.warning(f"Error parsing uploaded file: {e}")

    identity = await llm_service.identify_product(
        name=pname, model=model, mpn=mpn, url=url, text_sample=text_sample
    )

    state["product_identity"] = identity
    state["progress"] = 15
    state["current_node"] = "identify_product"
    state["status_message"] = f"Product identified: {identity.get('product_name')} ({identity.get('brand') or 'Verified'})"
    return state


async def generate_queries_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: generate_queries")
    identity = state.get("product_identity", {})
    pname = identity.get("product_name", "Product")
    brand = identity.get("brand", "")
    model = identity.get("model", "")

    base = f"{brand} {pname} {model}".strip()

    queries = [
        f"{base} official specifications",
        f"{base} technical datasheet pdf",
        f"{base} manual user guide",
        f"{base} hardware details battery ram display"
    ]

    state["generated_queries"] = queries
    state["progress"] = 25
    state["current_node"] = "generate_queries"
    state["status_message"] = f"Generated {len(queries)} targeted web discovery queries"
    return state


async def search_web_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: search_web")
    queries = state.get("generated_queries", [])
    search_provider = get_search_provider()

    all_results = []
    seen_urls = set()

    for q in queries:
        try:
            res = await search_provider.search(q, max_results=3)
            for r in res:
                if r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    all_results.append(r)
        except Exception as e:
            logger.warning(f"Search provider error for query '{q}': {e}")

    state["raw_search_results"] = all_results
    state["progress"] = 35
    state["current_node"] = "search_web"
    state["status_message"] = f"Discovered {len(all_results)} candidate technical web sources"
    return state


async def rank_sources_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: rank_sources")
    raw_results = state.get("raw_search_results", [])

    # Sort by authority score descending
    ranked = sorted(raw_results, key=lambda x: x.get("authority_score", 0.5), reverse=True)

    state["ranked_sources"] = ranked
    state["progress"] = 45
    state["current_node"] = "rank_sources"
    state["status_message"] = f"Ranked {len(ranked)} sources by domain authority"
    return state


async def collect_documents_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: collect_documents")
    ranked = state.get("ranked_sources", [])
    file_path = state.get("input_file_path")

    documents = []

    # Include user input text if present
    user_text = state.get("text")
    if user_text and user_text.strip():
        documents.append({
            "source_id": "USER_PROVIDED_TEXT",
            "title": "User Provided Product Specification Text",
            "url": "user-input",
            "domain": "user-input",
            "source_type": "OFFICIAL_DATASHEET",
            "authority_score": 0.98,
            "content": user_text,
            "pages": [{"page_number": 1, "text": user_text}]
        })

    # Include uploaded PDF document if present
    if file_path and os.path.exists(file_path):
        try:
            parsed_pdf = DocumentParser.parse_pdf(file_path, source_id="UPLOADED_PDF")
            documents.append({
                "source_id": "UPLOADED_PDF",
                "title": parsed_pdf["title"],
                "url": file_path,
                "source_type": "OFFICIAL_DATASHEET",
                "authority_score": 0.98,
                "content": parsed_pdf["text"],
                "pages": parsed_pdf["pages"]
            })
        except Exception as e:
            logger.warning(f"PDF Parsing error: {e}")

    # Convert ranked search results into web document records
    for i, src in enumerate(ranked[:5]):
        documents.append({
            "source_id": f"WEB_SRC_{i+1}",
            "title": src.get("title"),
            "url": src.get("url"),
            "domain": src.get("domain"),
            "source_type": src.get("source_type"),
            "authority_score": src.get("authority_score"),
            "content": src.get("snippet"),
            "pages": [{"page_number": 1, "text": src.get("snippet")}]
        })

    state["collected_documents"] = documents
    state["progress"] = 55
    state["current_node"] = "collect_documents"
    state["status_message"] = f"Collected {len(documents)} document pages and web snippets"
    return state


async def extract_attributes_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: extract_attributes")
    docs = state.get("collected_documents", [])
    extracted_by_source = []

    for doc in docs:
        doc_pages = doc.get("pages", [])
        extracted_doc_attrs = []

        if len(doc_pages) > 1:
            for page in doc_pages:
                p_num = page.get("page_number", 1)
                p_text = page.get("text", "")
                if p_text.strip():
                    page_attrs = await llm_service.extract_attributes_from_document(
                        doc_text=p_text,
                        doc_source_name=doc.get("title", "Source"),
                        doc_url=doc.get("url", ""),
                        page_number=p_num
                    )
                    if page_attrs:
                        extracted_doc_attrs.extend(page_attrs)
        else:
            extracted_doc_attrs = await llm_service.extract_attributes_from_document(
                doc_text=doc.get("content", ""),
                doc_source_name=doc.get("title", "Source"),
                doc_url=doc.get("url", ""),
                page_number=1
            )

        if extracted_doc_attrs:
            extracted_by_source.append({
                "source_name": doc.get("title"),
                "source_url": doc.get("url"),
                "source_type": doc.get("source_type", "UNKNOWN_WEBSITE"),
                "authority_score": doc.get("authority_score", 0.50),
                "attributes": extracted_doc_attrs
            })

    state["extracted_attributes_by_source"] = extracted_by_source
    state["progress"] = 65
    state["current_node"] = "extract_attributes"
    state["status_message"] = f"Extracted raw attributes from {len(extracted_by_source)} sources"
    return state


async def normalize_attributes_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: normalize_attributes")
    extracted_by_source = state.get("extracted_attributes_by_source", [])

    normalized_by_source = []
    for src in extracted_by_source:
        norm_attrs = []
        for attr in src.get("attributes", []):
            aname = attr.get("attribute_name")
            val = attr.get("value")
            norm_dict, unit = NormalizationEngine.normalize_attribute(aname, val)
            attr_copy = dict(attr)
            attr_copy["normalized_value"] = norm_dict
            attr_copy["unit"] = unit
            norm_attrs.append(attr_copy)

        src_copy = dict(src)
        src_copy["attributes"] = norm_attrs
        normalized_by_source.append(src_copy)

    state["extracted_attributes_by_source"] = normalized_by_source
    state["progress"] = 72
    state["current_node"] = "normalize_attributes"
    state["status_message"] = "Normalized technical units across extracted specifications"
    return state


async def validate_attributes_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: validate_attributes")
    extracted_by_source = state.get("extracted_attributes_by_source", [])

    validated, conflicts = ValidationEngine.perform_cross_source_validation(extracted_by_source)

    # Convert to standard dict representations
    state["validated_attributes"] = [a.model_dump() for a in validated]
    state["conflicts"] = [c.model_dump() for c in conflicts]
    state["progress"] = 80
    state["current_node"] = "validate_attributes"
    state["status_message"] = f"Cross-source validation completed. {len(validated)} attributes checked, {len(conflicts)} conflict(s) detected."
    return state


def check_conflicts_condition(state: ProductState) -> str:
    conflicts = state.get("conflicts", [])
    if len(conflicts) > 0:
        return "resolve_conflicts"
    return "enrich_product"


async def resolve_conflicts_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: resolve_conflicts")
    val_attrs_dict = state.get("validated_attributes", [])
    conflicts_dict = state.get("conflicts", [])

    val_attrs = [ProductAttributeSchema(**a) for a in val_attrs_dict]
    conflicts = [ConflictSchema(**c) for c in conflicts_dict]

    resolved_attrs, updated_conflicts = ConflictResolver.resolve_conflicts(val_attrs, conflicts)

    state["validated_attributes"] = [a.model_dump() for a in resolved_attrs]
    state["conflicts"] = [c.model_dump() for c in updated_conflicts]
    state["progress"] = 85
    state["current_node"] = "resolve_conflicts"

    resolved_count = sum(1 for c in updated_conflicts if c.resolution_status == "RESOLVED")
    state["status_message"] = f"Conflict resolution completed. {resolved_count} conflict(s) resolved via authority rules."
    return state


async def enrich_product_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: enrich_product")
    val_attrs = state.get("validated_attributes", [])
    identity = state.get("product_identity", {})

    # Generate optional commerce metadata (separated from technical specs)
    commerce_meta = await llm_service.generate_commerce_content(identity, val_attrs)

    state["commerce_metadata"] = commerce_meta
    state["progress"] = 90
    state["current_node"] = "enrich_product"
    state["status_message"] = "Enriched missing metadata and generated commerce highlights"
    return state


async def calculate_confidence_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: calculate_confidence")
    val_attrs = state.get("validated_attributes", [])
    identity = state.get("product_identity", {})
    sources = state.get("ranked_sources", [])
    conflicts = state.get("conflicts", [])

    # Calculate overall metrics
    p_identity = state.get("product_identity", {})
    from app.schemas.product import ProductIdentity
    pid_obj = ProductIdentity(**p_identity)
    
    attr_objs = [ProductAttributeSchema(**a) for a in val_attrs]
    metrics = ConfidenceEngine.calculate_product_overall_metrics(
        identity=pid_obj,
        attributes=attr_objs,
        sources_count=len(sources),
        conflicts_count=len(conflicts)
    )

    state["confidence_scores"] = metrics
    state["progress"] = 95
    state["current_node"] = "calculate_confidence"
    state["status_message"] = f"Calculated verification score ({metrics['verification_rate']}%) and transparent confidence."
    return state


async def finalize_product_node(state: ProductState) -> ProductState:
    logger.info("LangGraph Node: finalize_product")
    
    final_output = {
        "identity": state.get("product_identity"),
        "attributes": state.get("validated_attributes", []),
        "sources": state.get("ranked_sources", []),
        "conflicts": state.get("conflicts", []),
        "commerce_metadata": state.get("commerce_metadata"),
        "confidence_scores": state.get("confidence_scores")
    }

    state["final_product"] = final_output
    state["progress"] = 100
    state["current_node"] = "finalize_product"
    state["status_message"] = "Product Intelligence analysis completed successfully!"
    return state


# --- BUILD LANGGRAPH WORKFLOW ---

def create_unispecs_graph() -> StateGraph:
    workflow = StateGraph(ProductState)

    workflow.add_node("identify_product", identify_product_node)
    workflow.add_node("generate_queries", generate_queries_node)
    workflow.add_node("search_web", search_web_node)
    workflow.add_node("rank_sources", rank_sources_node)
    workflow.add_node("collect_documents", collect_documents_node)
    workflow.add_node("extract_attributes", extract_attributes_node)
    workflow.add_node("normalize_attributes", normalize_attributes_node)
    workflow.add_node("validate_attributes", validate_attributes_node)
    workflow.add_node("resolve_conflicts", resolve_conflicts_node)
    workflow.add_node("enrich_product", enrich_product_node)
    workflow.add_node("calculate_confidence", calculate_confidence_node)
    workflow.add_node("finalize_product", finalize_product_node)

    # Graph Edges
    workflow.set_entry_point("identify_product")
    workflow.add_edge("identify_product", "generate_queries")
    workflow.add_edge("generate_queries", "search_web")
    workflow.add_edge("search_web", "rank_sources")
    workflow.add_edge("rank_sources", "collect_documents")
    workflow.add_edge("collect_documents", "extract_attributes")
    workflow.add_edge("extract_attributes", "normalize_attributes")
    workflow.add_edge("normalize_attributes", "validate_attributes")

    # Conditional Branching
    workflow.add_conditional_edges(
        "validate_attributes",
        check_conflicts_condition,
        {
            "resolve_conflicts": "resolve_conflicts",
            "enrich_product": "enrich_product"
        }
    )

    workflow.add_edge("resolve_conflicts", "enrich_product")
    workflow.add_edge("enrich_product", "calculate_confidence")
    workflow.add_edge("calculate_confidence", "finalize_product")
    workflow.add_edge("finalize_product", END)

    return workflow.compile()
