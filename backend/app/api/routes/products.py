from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Product, ProductAttribute, Source, Conflict
from app.schemas.product import APIResponse, ProductSchema, ProductIdentity, ProductAttributeSchema, SourceSchema, ConflictSchema
from app.services.export_service import ExportService

router = APIRouter()


@router.get("/products", response_model=APIResponse)
async def list_products(
    search: Optional[str] = Query(None, description="Search by brand, name, model, or MPN"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Product)
        .options(
            selectinload(Product.attributes),
            selectinload(Product.sources),
            selectinload(Product.conflicts)
        )
        .order_by(Product.created_at.desc())
    )

    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.brand.ilike(term),
                Product.product_name.ilike(term),
                Product.model.ilike(term),
                Product.mpn.ilike(term),
                Product.category.ilike(term)
            )
        )

    stmt = stmt.limit(limit).offset(offset)
    res = await db.execute(stmt)
    products = res.scalars().all()

    items = [
        {
            "id": p.id,
            "brand": p.brand,
            "product_name": p.product_name,
            "model": p.model,
            "mpn": p.mpn,
            "sku": p.sku,
            "category": p.category,
            "variant": p.variant,
            "image_url": p.image_url,
            "identity_confidence": p.identity_confidence,
            "identity_status": p.identity_status,
            "attributes_count": len(p.attributes) if p.attributes else 0,
            "sources_count": len(p.sources) if p.sources else 0,
            "conflicts_count": len(p.conflicts) if p.conflicts else 0,
            "created_at": p.created_at,
            "updated_at": p.updated_at
        }
        for p in products
    ]

    return APIResponse(data=items)


@router.get("/products/{product_id}", response_model=APIResponse)
async def get_product_details(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Product)
        .options(
            selectinload(Product.attributes),
            selectinload(Product.sources),
            selectinload(Product.conflicts)
        )
        .where(Product.id == product_id)
    )
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product_dict = {
        "id": product.id,
        "identity": {
            "brand": product.brand,
            "product_name": product.product_name,
            "model": product.model,
            "mpn": product.mpn,
            "sku": product.sku,
            "category": product.category,
            "variant": product.variant,
            "image_url": product.image_url,
            "identity_confidence": product.identity_confidence,
            "identity_status": product.identity_status,
            "possible_matches": product.possible_matches
        },
        "attributes": [
            {
                "id": a.id,
                "attribute_name": a.attribute_name,
                "category": a.category,
                "value": a.value,
                "normalized_value": a.normalized_value,
                "unit": a.unit,
                "source_name": a.source_name,
                "source_url": a.source_url,
                "source_type": a.source_type,
                "evidence_snippet": a.evidence_snippet,
                "page_number": a.page_number,
                "section": a.section,
                "confidence": a.confidence,
                "confidence_reason": a.confidence_reason,
                "verification_status": a.verification_status,
                "extraction_method": a.extraction_method,
                "last_verified_at": a.last_verified_at
            }
            for a in product.attributes
        ],
        "sources": [
            {
                "id": s.id,
                "title": s.title,
                "url": s.url,
                "domain": s.domain,
                "source_type": s.source_type,
                "authority_score": s.authority_score,
                "is_official": s.is_official,
                "attributes_extracted_count": s.attributes_extracted_count,
                "retrieved_at": s.retrieved_at
            }
            for s in product.sources
        ],
        "conflicts": [
            {
                "id": c.id,
                "attribute_name": c.attribute_name,
                "conflict_type": c.conflict_type,
                "competing_values": c.competing_values,
                "resolution_status": c.resolution_status,
                "resolved_value": c.resolved_value,
                "resolution_reason": c.resolution_reason
            }
            for c in product.conflicts
        ],
        "created_at": product.created_at,
        "updated_at": product.updated_at
    }

    return APIResponse(data=product_dict)


@router.get("/products/{product_id}/attributes", response_model=APIResponse)
async def get_product_attributes(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(ProductAttribute).where(ProductAttribute.product_id == product_id)
    res = await db.execute(stmt)
    attributes = res.scalars().all()

    items = [
        {
            "id": a.id,
            "attribute_name": a.attribute_name,
            "category": a.category,
            "value": a.value,
            "normalized_value": a.normalized_value,
            "unit": a.unit,
            "source_name": a.source_name,
            "source_url": a.source_url,
            "confidence": a.confidence,
            "confidence_reason": a.confidence_reason,
            "verification_status": a.verification_status
        }
        for a in attributes
    ]
    return APIResponse(data=items)


@router.get("/products/{product_id}/sources", response_model=APIResponse)
async def get_product_sources(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Source).where(Source.product_id == product_id)
    res = await db.execute(stmt)
    sources = res.scalars().all()

    items = [
        {
            "id": s.id,
            "title": s.title,
            "url": s.url,
            "domain": s.domain,
            "source_type": s.source_type,
            "authority_score": s.authority_score,
            "is_official": s.is_official
        }
        for s in sources
    ]
    return APIResponse(data=items)


@router.get("/products/{product_id}/validation", response_model=APIResponse)
async def get_product_validation(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt_attr = select(ProductAttribute).where(ProductAttribute.product_id == product_id)
    res_attr = await db.execute(stmt_attr)
    attrs = res_attr.scalars().all()

    stmt_conf = select(Conflict).where(Conflict.product_id == product_id)
    res_conf = await db.execute(stmt_conf)
    conflicts = res_conf.scalars().all()

    verified_count = sum(1 for a in attrs if a.verification_status == "VERIFIED")
    conflicts_count = len(conflicts)
    needs_review_count = sum(1 for a in attrs if a.verification_status == "NEEDS_REVIEW")

    return APIResponse(
        data={
            "overall_validation_score": round((verified_count / max(1, len(attrs))) * 100, 1),
            "verified_attributes_count": verified_count,
            "conflicts_count": conflicts_count,
            "needs_review_count": needs_review_count,
            "conflicts": [
                {
                    "id": c.id,
                    "attribute_name": c.attribute_name,
                    "conflict_type": c.conflict_type,
                    "competing_values": c.competing_values,
                    "resolution_status": c.resolution_status,
                    "resolved_value": c.resolved_value,
                    "resolution_reason": c.resolution_reason
                }
                for c in conflicts
            ]
        }
    )


@router.get("/products/{product_id}/evidence", response_model=APIResponse)
async def get_product_evidence(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(ProductAttribute).where(ProductAttribute.product_id == product_id)
    res = await db.execute(stmt)
    attributes = res.scalars().all()

    evidence_graph = [
        {
            "attribute_name": a.attribute_name,
            "value": a.value,
            "verification_status": a.verification_status,
            "confidence": a.confidence,
            "source_name": a.source_name,
            "source_url": a.source_url,
            "source_type": a.source_type,
            "evidence_snippet": a.evidence_snippet,
            "page_number": a.page_number,
            "section": a.section
        }
        for a in attributes if a.evidence_snippet or a.source_url
    ]

    return APIResponse(data=evidence_graph)


@router.get("/products/{product_id}/export")
async def export_product_data(
    product_id: str,
    format: str = Query("json", pattern="^(json|csv|excel)$"),
    db: AsyncSession = Depends(get_db)
):
    # Fetch full product graph
    prod_resp = await get_product_details(product_id, db)
    pdata = prod_resp.data
    brand = (pdata.get("identity", {}).get("brand") or "product").replace(" ", "_")
    prod_name = (pdata.get("identity", {}).get("product_name") or product_id[:8]).replace(" ", "_")
    safe_filename_base = f"unispecs_{brand}_{prod_name}"

    if format == "json":
        content = ExportService.export_json(pdata)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename_base}.json"'}
        )
    elif format == "csv":
        content = ExportService.export_csv(pdata)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename_base}.csv"'}
        )
    elif format == "excel":
        content = ExportService.export_excel(pdata)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename_base}.xlsx"'}
        )

