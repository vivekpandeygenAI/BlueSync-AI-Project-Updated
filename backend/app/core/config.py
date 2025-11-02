"""
Application configuration management
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Basic app settings
    PROJECT_NAME: str = "Healthcare AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    
    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://automating-test-case-frontend.web.app",
        "https://automating-test-case-frontend--staging-mywigejr.web.app",
        "127.0.0.1:8000"
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Google Cloud settings
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "learned-pier-471309-h9")
    VERTEX_LOCATION: str = os.getenv("VERTEX_LOCATION", "asia-south2")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    
    # BigQuery settings
    BIGQUERY_DATASET: str = "test_cases"
    
    # PostgreSQL settings
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "IP_ADDRESS")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "PORT")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB","postgres")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD","Password")

    # JIRA settings
    JIRA_BASE: str = os.getenv("JIRA_BASE", "https://your-domain.atlassian.net")
    JIRA_EMAIL: Optional[str] = os.getenv("JIRA_EMAIL")
    JIRA_API_TOKEN: Optional[str] = os.getenv("JIRA_API_TOKEN")
    JIRA_PROJECT_KEY: str = os.getenv("JIRA_PROJECT_KEY", "KAN")
    JIRA_REQ_ISSUE_TYPE: str = os.getenv("JIRA_REQ_ISSUE_TYPE", "Task")
    JIRA_TC_SUBTASK_TYPE: str = os.getenv("JIRA_TC_SUBTASK_TYPE", "Sub-task")
    
    # Processing settings
    MAX_WORKERS: int = 12
    MAX_JIRA_WORKERS: int = 5
    INPUT_EXAMPLES_PER_REQ: int = 3
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
