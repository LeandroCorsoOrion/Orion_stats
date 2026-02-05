"""
Orion Stats - Configuration Settings
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Orion Stats"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8055

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5555", "http://localhost:5173", "http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./orion_stats.db"
    
    # File Storage
    DATA_DIR: Path = Path("./data")
    MODELS_DIR: Path = Path("./models")
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
