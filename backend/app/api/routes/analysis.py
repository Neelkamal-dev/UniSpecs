import os
import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import AnalysisJob, AnalysisEvent, Product, ProductAttribute, Source, Conflict
from app.schemas.product import AnalysisRequest, APIResponse, APIErrorResponse
from app.ai.graph.graph import create_unispecs_graph
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

unispecs_graph = create_unispecs_graph()


async def run_analysis_graph_task(job_id: str, initial_state: dict):
    """
    Background worker executing the LangGraph analysis pipeline and persisting results into database.
    """
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # 1. Update job status to RUNNING
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            res = await db.execute(stmt)
            job = res.scalar_one_or_none()
            if not job:
                return

            job.status = "RUNNING"
            job.progress = 5
            job.message = "Initializing analysis pipeline..."
            await db.commit()

            # Execute LangGraph steps
            final_state = await unispecs_graph.ainvoke(initial_state)

            # Persist completed product intelligence in DB
            product_id = str(uuid.uuid4())
            identity = final_state.get("product_identity", {})

            product = Product(
                id=product_id,
                brand=identity.get("brand"),
                product_name=identity.get("product_name", "Unknown Product"),
                model=identity.get("model"),
                mpn=identity.get("mpn"),
                category=identity.get("category"),
                variant=identity.get("variant"),
                identity_confidence=identity.get("identity_confidence", 0.90),
                identity_status=identity.get("identity_status", "VERIFIED")
            )
            db.add(product)

            # Persist Attributes
            for attr_dict in final_state.get("validated_attributes", []):
                attribute = ProductAttribute(
                    id=str(uuid.uuid4()),
                    product_id=product_id,
                    attribute_name=attr_dict.get("attribute_name"),
                    category=attr_dict.get("category", "General"),
                    value=str(attr_dict.get("value")) if attr_dict.get("value") is not None else None,
                    normalized_value=attr_dict.get("normalized_value"),
                    unit=attr_dict.get("unit"),
                    source_name=attr_dict.get("source_name"),
                    source_url=attr_dict.get("source_url"),
                    source_type=attr_dict.get("source_type"),
                    evidence_snippet=attr_dict.get("evidence_snippet"),
                    page_number=attr_dict.get("page_number"),
                    section=attr_dict.get("section"),
                    confidence=attr_dict.get("confidence", 0.80),
                    confidence_reason=attr_dict.get("confidence_reason"),
                    verification_status=attr_dict.get("verification_status", "VERIFIED"),
                    extraction_method=attr_dict.get("extraction_method", "DIRECT_EXTRACTION")
                )
                db.add(attribute)

            # Persist Sources
            for src_dict in final_state.get("ranked_sources", []):
                source = Source(
                    id=str(uuid.uuid4()),
                    product_id=product_id,
                    title=src_dict.get("title"),
                    url=src_dict.get("url"),
                    domain=src_dict.get("domain"),
                    source_type=src_dict.get("source_type", "UNKNOWN_WEBSITE"),
                    authority_score=src_dict.get("authority_score", 0.50),
                    is_official="MANUFACTURER" in src_dict.get("source_type", ""),
                    attributes_extracted_count=2
                )
                db.add(source)

            # Persist Conflicts
            for c_dict in final_state.get("conflicts", []):
                conflict = Conflict(
                    id=str(uuid.uuid4()),
                    product_id=product_id,
                    attribute_name=c_dict.get("attribute_name"),
                    conflict_type=c_dict.get("conflict_type", "VALUE_CONFLICT"),
                    competing_values=c_dict.get("competing_values", []),
                    resolution_status=c_dict.get("resolution_status", "UNRESOLVED"),
                    resolved_value=c_dict.get("resolved_value"),
                    resolution_reason=c_dict.get("resolution_reason")
                )
                db.add(conflict)

            # Update job status to COMPLETED
            job.product_id = product_id
            job.status = "COMPLETED"
            job.current_node = "finalize_product"
            job.progress = 100
            job.message = "Analysis finished successfully."
            job.completed_at = datetime.utcnow()
            job.result_summary = final_state.get("confidence_scores")
            await db.commit()

        except Exception as e:
            logger.error(f"Analysis job {job_id} failed: {e}", exc_info=True)
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            res = await db.execute(stmt)
            job = res.scalar_one_or_none()
            if job:
                job.status = "FAILED"
                job.error_message = str(e)
                job.message = "Analysis job failed due to execution error."
                await db.commit()


@router.post("/analysis", response_model=APIResponse)
async def create_analysis_job(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    
    raw_input_name = request.product_name or (request.text[:100] if request.text else None) or "Product Search"
    
    job = AnalysisJob(
        id=job_id,
        input_product_name=raw_input_name,
        input_model=request.model,
        input_url=request.url,
        status="QUEUED",
        current_node="identify_product",
        progress=0,
        message="Job queued for execution."
    )
    db.add(job)
    await db.commit()

    initial_state = {
        "analysis_job_id": job_id,
        "input_product_name": request.product_name or request.text,
        "input_model": request.model,
        "input_mpn": request.mpn,
        "input_url": request.url,
        "text": request.text,
        "query": f"{request.product_name or ''} {request.model or ''}".strip()
    }

    background_tasks.add_task(run_analysis_graph_task, job_id, initial_state)

    return APIResponse(
        data={
            "job_id": job_id,
            "status": "QUEUED",
            "message": "Analysis job created and queued."
        }
    )


@router.post("/analysis/upload", response_model=APIResponse)
async def upload_document_and_analyze(
    background_tasks: BackgroundTasks,
    product_name: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are currently supported for upload.")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    job_id = str(uuid.uuid4())
    job = AnalysisJob(
        id=job_id,
        input_product_name=product_name or file.filename,
        input_model=model,
        input_file_path=file_path,
        status="QUEUED",
        current_node="identify_product",
        progress=0,
        message="Uploaded PDF document queued for parsing."
    )
    db.add(job)
    await db.commit()

    initial_state = {
        "analysis_job_id": job_id,
        "input_product_name": product_name or os.path.splitext(file.filename)[0],
        "input_model": model,
        "input_file_path": file_path,
        "query": f"{product_name or ''} {model or ''}".strip()
    }

    background_tasks.add_task(run_analysis_graph_task, job_id, initial_state)

    return APIResponse(
        data={
            "job_id": job_id,
            "status": "QUEUED",
            "file_name": file.filename,
            "message": "PDF uploaded successfully. Analysis job queued."
        }
    )


@router.get("/analysis/history", response_model=APIResponse)
async def list_analysis_history(db: AsyncSession = Depends(get_db)):
    stmt = select(AnalysisJob).order_by(AnalysisJob.created_at.desc()).limit(20)
    res = await db.execute(stmt)
    jobs = res.scalars().all()

    items = []
    for j in jobs:
        items.append({
            "job_id": j.id,
            "product_id": j.product_id,
            "input_product_name": j.input_product_name,
            "input_model": j.input_model,
            "status": j.status,
            "progress": j.progress,
            "created_at": j.created_at,
            "completed_at": j.completed_at
        })

    return APIResponse(data=items)


@router.get("/analysis/{job_id}", response_model=APIResponse)
async def get_analysis_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found.")

    return APIResponse(
        data={
            "job_id": job.id,
            "product_id": job.product_id,
            "status": job.status,
            "current_node": job.current_node,
            "progress": job.progress,
            "message": job.message,
            "error_message": job.error_message,
            "result_summary": job.result_summary,
            "created_at": job.created_at,
            "completed_at": job.completed_at
        }
    )
