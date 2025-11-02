"""
Main API router
"""
from fastapi import APIRouter
from app.api.v1.endpoints import files, requirements, test_cases, jira

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(requirements.router, prefix="/requirements", tags=["requirements"])
api_router.include_router(test_cases.router, prefix="/test-cases", tags=["test-cases"])
api_router.include_router(jira.router, prefix="/jira", tags=["jira"])
