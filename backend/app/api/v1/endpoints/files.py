"""
File upload and management endpoints
"""
import uuid
import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.models.schemas import MultiUploadResponse, FileInfo
from app.services.document_service import document_service
from app.services.database_service import database_service
from app.services.vector_db_service import vector_db_service
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/upload", response_model=MultiUploadResponse)
async def upload_files(
    requirement_files: List[UploadFile] = File([]),
    input_files: List[UploadFile] = File([])
):
    """
    Upload requirement and input files for processing
    """
    try:
        print("Uploading files...")
        filenames = []
        file_id = str(uuid.uuid4())
        requirement_content = ""
        input_content = ""
        count_req = 0
        count_input = 0
        
        # Check for duplicate filenames
        all_files = requirement_files + input_files
        existing_files = database_service.get_files()
        existing_names = {f["filename"] for f in existing_files}
        
        for file in all_files:
            if file.filename in existing_names:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File '{file.filename}' has already been uploaded"
                )
        
        # Process requirement files
        if requirement_files:
            req_contents = []
            req_names = []
            for file in requirement_files:
                content = await file.read()
                extracted_text = document_service.extract_text_from_bytes(file.filename, content)
                req_contents.append(extracted_text)
                req_names.append(file.filename)
            
            count_req = len(req_contents)
            requirement_content = "\n\n".join(req_contents)
            all_req_names = ",".join(req_names)
            filenames.append(all_req_names)
            print("requirement_content:", requirement_content)
            # Store requirements in vector database for semantic search
            try:
                vector_db_service.store_document(
                    content=requirement_content,
                    metadata={"type": "requirement", "filenames": all_req_names}
                )
                print(f"Stored requirement documents in vector DB ({len(req_contents)} chunks expected after split).")
            except Exception as e:
                # Don't fail the whole upload on vector DB errors; log and continue
                print(f"Warning: Failed to store requirements in vector DB: {e}")
        
        # Process input files
        if input_files:
            requirement_data = []
            for file in input_files:
                content = await file.read()
                extracted_text = document_service.extract_text_from_bytes(file.filename, content)
                final_requirement=extracted_text.replace("1 text ","").replace("\r","").split("\n")
                #print(f"extracted_text: {final_requirement}")
                requirement_data.extend(final_requirement)
            # Keep track of how many input files were processed
            count_input = len(input_files)
            
            # Process each requirement with semantic search context
            requirements = []
            for req in requirement_data:
                # Skip empty lines
                if not req.strip():
                    continue
                    
                # Get similar contexts from vector DB
                limit = 5
                similar_contexts = vector_db_service.semantic_search(query=req, top_k=limit)
                #print(f"Similar contexts for requirement '{req}': {similar_contexts}")
                # Generate requirement with context
                requirement = ai_service.extract_single_requirement_with_context(req, similar_contexts)
                if requirement:
                    requirement_id = str(uuid.uuid4())
                    req_title_id = f"REQ-{len(requirements)+1:03d}"
                    
                    # Prepare requirement for database
                    db_requirement = {
                        "file_id": file_id,
                        "requirement_id": requirement_id,
                        "req_title_id": req_title_id,
                        "title": requirement.get("title", "Untitled Requirement"),
                        "description": requirement.get("description", "No description provided"),
                        "type": requirement.get("type", "Functional"),
                        "source": requirement.get("source", "AI Generated with Context"),
                        "category": requirement.get("category", ""),
                        "priority": requirement.get("priority", "Medium"),
                        "created_at": datetime.datetime.now().isoformat()
                    }
                    print(f"Generated requirement: {db_requirement}")
                    requirements.append(db_requirement)
            
            # Save generated requirements to database
            if requirements:
                database_service.save_requirements(requirements)
            
        message = (
            f"Success! {count_req} requirement documents and {count_input} input files were processed. "
            "Documents have been vectorized for semantic search."
        )
        
        return MultiUploadResponse(
            file_ids=[file_id], 
            filenames=filenames, 
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload/extract failed: {e}")


@router.get("/", response_model=List[FileInfo])
def get_files():
    """Get all uploaded files"""
    try:
        return database_service.get_files()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch files: {e}")


@router.get("/search")
def semantic_search(query: str = None, limit: int = 5):
    """
    Perform semantic search across all uploaded documents
    """
    try:
        if not query:
            raise HTTPException(status_code=400, detail="Query parameter is required")
            
        results = vector_db_service.semantic_search(
            query=query,
            top_k=limit
        )
        return {
            "query": query,
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {str(e)}"
        )
