import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import init_db
from app.api.routes import health, analysis, products
from app.schemas.product import APIErrorResponse, APIErrorDetails

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing UniSpecs Database Engine...")
    await init_db()
    logger.info("UniSpecs Backend operational.")
    yield
    logger.info("Shutting down UniSpecs Backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=APIErrorResponse(
            error=APIErrorDetails(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred during operation execution.",
                details={"path": str(request.url), "error": str(exc)}
            )
        ).model_dump()
    )


# Include API v1 Routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=["Analysis"])
app.include_router(products.router, prefix=settings.API_V1_STR, tags=["Products"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to UniSpecs — AI-Powered Verified Product Intelligence Platform API",
        "documentation": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
