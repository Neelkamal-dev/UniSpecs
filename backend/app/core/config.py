import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "UniSpecs — AI-Powered Verified Product Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # Provider Keys
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "groq/compound"
    TAVILY_API_KEY: str = ""
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 25
    
    # Configurable Source Authority Heuristics
    AUTHORITY_SCORES: dict = {
        "MANUFACTURER_PAGE": 0.99,
        "MANUFACTURER_TECH_DOC": 0.98,
        "OFFICIAL_DATASHEET": 0.95,
        "AUTHORIZED_DISTRIBUTOR": 0.90,
        "REPUTABLE_DATABASE": 0.75,
        "OTHER_CATALOG": 0.60,
        "UNKNOWN_WEBSITE": 0.50
    }

    model_config = SettingsConfigDict(
        env_file=["backend/.env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
