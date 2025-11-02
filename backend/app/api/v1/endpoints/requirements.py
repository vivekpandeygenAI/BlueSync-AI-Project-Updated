"""
Requirements extraction and management endpoints
"""
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Path
from app.models.schemas import RequirementExtractionResponse, RequirementResponse
from app.services.ai_service import ai_service
from app.services.database_service import database_service

router = APIRouter()


@router.post("/{file_id}/extract", response_model=RequirementExtractionResponse)
def extract_requirements(file_id: str = Path(..., description="ID returned by file upload")):
    """
    Extract requirements from uploaded file using AI
    """
    try:
        # Get file data
        extracted_data = database_service.get_file_data(file_id)
        if not extracted_data:
            raise HTTPException(status_code=404, detail="File not found or no extracted data")
        
        # Extract requirements using AI
        requirements = ai_service.extract_requirements_from_text(extracted_data)
        
        if not requirements:
            raise HTTPException(status_code=422, detail="No requirements found by the AI service")
        
        # Prepare requirements for database
        bq_requirements = []
        for i, req in enumerate(requirements, start=1):
            requirement_id = str(uuid.uuid4())
            req_title_id = f"REQ-{i:03d}"
            bq_requirements.append({
                "file_id": file_id,
                "requirement_id": requirement_id,
                "req_title_id": req_title_id,
                "title": req.get("title", "Untitled Requirement"),
                "description": req.get("description", "No description provided"),
                "type": req.get("type", "Functional"),
                "source": req.get("source", "AI Extracted"),
                "category": req.get("category", ""),
                "priority": req.get("priority", "Medium"),
                "created_at": datetime.now().isoformat()
            })
        
        # Save to database
        database_service.save_requirements(bq_requirements)
        database_service.update_file_status(file_id, "Features Extracted")
        
        return RequirementExtractionResponse(
            message=f"Extracted and saved {len(bq_requirements)} requirements for file {file_id}",
            requirement_count=len(bq_requirements),
            requirements=[RequirementResponse(**req) for req in bq_requirements]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Requirement extraction failed: {e}")


@router.get("/", response_model=List[RequirementResponse])
def get_requirements():
    """Get all requirements (no file_id dependency)"""
    try:
        requirements = database_service.get_requirements()
        return [RequirementResponse(**req) for req in requirements]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch requirements: {e}")
