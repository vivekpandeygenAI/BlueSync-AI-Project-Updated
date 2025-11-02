"""
Test case generation and management endpoints
"""
import json
import time
import uuid
from typing import List, Dict, Any,Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import APIRouter, HTTPException, Path, Body
from app.models.schemas import (
    TestCaseGenerationResponse, 
    TestCaseResponse, 
    ImproveTestCaseRequest
)
from app.services.ai_service import ai_service
from app.services.database_service import database_service
from app.core.config import settings

router = APIRouter()


@router.post("/generate/file/{file_id}", response_model=TestCaseGenerationResponse)
def generate_test_cases_for_file(file_id: str = Path(..., description="File ID to generate test cases for")):
    """
    Generate test cases for all requirements in a file
    """
    try:
        # Get input data and requirements
        input_data = database_service.get_input_data(file_id)
        requirements = database_service.get_requirements(file_id)
        
        if not requirements:
            raise HTTPException(status_code=404, detail="No requirements found for that file_id")
        
        per_requirement = {}
        all_test_cases = []
        start_time = time.time()
        
        # Generate test cases in parallel
        with ThreadPoolExecutor(max_workers=settings.MAX_WORKERS) as executor:
            future_map = {
                executor.submit(
                    ai_service.generate_test_cases, 
                    req["title"], 
                    req["description"], 
                    input_data
                ): req 
                for req in requirements
            }
            
            for fut in as_completed(future_map):
                req = future_map[fut]
                req_id = req["requirement_id"]
                
                try:
                    tests = fut.result(timeout=60)
                except Exception as e:
                    per_requirement[req_id] = {
                        "status": "error", 
                        "error": str(e), 
                        "generated": 0
                    }
                    continue
                
                if not tests:
                    per_requirement[req_id] = {
                        "status": "empty", 
                        "error": "No test cases", 
                        "generated": 0
                    }
                    continue
                
                # Process test cases
                test_cases = []
                input_examples = []
                
                for i, t in enumerate(tests, start=1):
                    input_value = _extract_input_from_test(t)
                    tc = {
                        "id": str(uuid.uuid4()),
                        "file_id": file_id,
                        "req_id": req_id,
                        "req_title_id": req["req_title_id"],
                        "req_title": req["title"],
                        "req_description": req["description"],
                        "tc_id": t.get("test_id") or f"TC-{i:03d}",
                        "tc_title": t.get("title") or "",
                        "tc_description": t.get("description") or "",
                        "expected_result": t.get("expected_result") or "",
                        "input_data": json.dumps(t.get("input_data", {})),
                        "compliance_tags": ",".join(t.get("compliance", [])) if isinstance(t.get("compliance", []), list) else "",
                        "risk": t.get("risk", "Low"),
                        "created_at": datetime.now().isoformat()
                    }
                    test_cases.append(tc)
                    
                    if input_value:
                        input_examples.append(input_value)
                
                all_test_cases.extend(test_cases)
                per_requirement[req_id] = {
                    "status": "ok",
                    "generated": len(test_cases),
                    "title": req["title"],
                    "input_examples": list(dict.fromkeys(input_examples))[:settings.INPUT_EXAMPLES_PER_REQ]
                }
        
        # Save test cases to database
        if all_test_cases:
            database_service.save_test_cases(all_test_cases)
            database_service.update_file_status(file_id, "Test Cases Generated")
        
        elapsed = round(time.time() - start_time, 2)
        
        return TestCaseGenerationResponse(
            message=f"Generated {len(all_test_cases)} test cases for {len(requirements)} requirements",
            total_testcases_generated=len(all_test_cases),
            elapsed_seconds=elapsed,
            per_requirement=per_requirement
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test case generation failed: {e}")


@router.post("/generate/requirement/{requirement_id}")
def generate_test_cases_for_requirement(requirement_id: str = Path(..., description="Requirement ID")):
    """
    Generate test cases for a single requirement
    """
    try:
        # Get requirement details
        requirements = database_service.get_requirements()
        req = next((r for r in requirements if r["requirement_id"] == requirement_id), None)
        
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found")
        
        # Get input data
        input_data = database_service.get_input_data(req["file_id"])
        
        # Generate test cases
        tests = ai_service.generate_test_cases(req["title"], req["description"], input_data)
        
        if not tests:
            raise HTTPException(status_code=422, detail="No test cases generated by AI model")
        
        # Prepare test cases for database
        test_cases = []
        for i, t in enumerate(tests, start=1):
            tc_id = t.get("test_id", f"TC-{i:03d}")
            test_cases.append({
                "file_id": req["file_id"],
                "req_id": requirement_id,
                "req_title_id": req["req_title_id"],
                "req_title": req["title"],
                "req_description": req["description"],
                "tc_id": tc_id,
                "tc_title": t.get("title", ""),
                "tc_description": t.get("description", ""),
                "expected_result": t.get("expected_result", ""),
                "input_data": json.dumps(t.get("input_data", {})),
                "compliance_tags": ",".join(t.get("compliance", [])),
                "risk": t.get("risk", "Low"),
                "created_at": datetime.now().isoformat(),
            })
        
        # Save to database
        database_service.save_test_cases(test_cases)
        database_service.update_file_status(req["file_id"], "Partially Test Cases Generated")
        
        return {
            "message": f"Generated {len(test_cases)} test cases for requirement {requirement_id}",
            "test_cases": test_cases
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test case generation failed: {e}")

@router.get("/")
def get_all_test_cases():
    """Get a flat list of all test cases across all files (no file_id required)
    This endpoint helps the frontend fetch test cases without passing file_id.
    """
    try:
        return database_service.get_all_test_cases()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch all test cases: {e}")


@router.post("/improve")
def improve_test_case(request: ImproveTestCaseRequest = Body(...)):
    """
    Improve a test case description based on user feedback and update it in BigQuery
    """
    try:
        # Fetch original description using database_service
        original_description = database_service.get_test_case_description(
            request.requirement_id,
            request.tc_id
        )
        if not original_description:
            raise HTTPException(status_code=404, detail="Test case not found for given requirement_id and tc_id")

        print(f"Original Description: {original_description}")
        # Use AI to improve description
        improved_description = ai_service.improve_test_case(
            original_description,
            request.user_input
        )

        # Update improved description in BigQuery using the service method
        database_service.update_test_case_description(
            request.requirement_id,
            request.tc_id,
            improved_description
        )

        return {
            "requirement_id": request.requirement_id,
            "tc_id": request.tc_id,
            "original_description": original_description,
            "improved_description": improved_description,
            "message": "Test case description improved and updated in DB."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to improve and update test case: {e}")


def _extract_input_from_test(test_case: Dict) -> str:
    """Extract input data from test case"""
    if not isinstance(test_case, dict):
        return ""
    
    for key in ("input_data", "input", "example_input", "example", "sample_input"):
        val = test_case.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
        if isinstance(val, dict):
            try:
                return json.dumps(val, ensure_ascii=False)
            except Exception:
                return str(val)
    
    return ""
