"""
Orion Analytics - Configuration Settings
"""
from pydantic import Field
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/


def _default_database_url() -> str:
    analytics_db = BASE_DIR / "orion_analytics.db"
    legacy_db = BASE_DIR / "orion_stats.db"

    # If the legacy DB exists and the new one does not, keep using legacy to avoid "losing" data
    # on rename. Users can override via DATABASE_URL any time.
    db_path = legacy_db if legacy_db.exists() and not analytics_db.exists() else analytics_db
    return f"sqlite:///{db_path.as_posix()}"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Orion Analytics"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8055

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5555", "http://localhost:5173", "http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = Field(default_factory=_default_database_url)
    
    # File Storage
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = BASE_DIR / "models"
    MAX_UPLOAD_SIZE_MB: int = 100
    
    # Data Processing
    PREVIEW_ROWS: int = 50
    DISCRETE_THRESHOLD: int = 30
    DISCRETE_RATIO: float = 0.02
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
