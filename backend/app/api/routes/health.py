from fastapi import APIRouter
from app.core.config import settings
from app.schemas.product import APIResponse

router = APIRouter()

@router.get("/health", response_model=APIResponse)
async def check_health():
    return APIResponse(
        data={
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "providers": {
                "gemini_api_configured": bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5),
                "tavily_api_configured": bool(settings.TAVILY_API_KEY and len(settings.TAVILY_API_KEY) > 5)
            }
        },
        meta={"timestamp": "now"}
    )
