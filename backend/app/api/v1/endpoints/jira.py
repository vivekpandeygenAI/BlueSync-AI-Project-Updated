"""
JIRA integration endpoints
"""
from typing import Dict
from fastapi import APIRouter, HTTPException, Path
from app.models.schemas import JiraPushResponse, ComplianceMetrics
from app.services.jira_service import jira_service
from app.services.database_service import database_service

router = APIRouter()


@router.post("/push", response_model=JiraPushResponse)
def push_test_cases_to_jira():
    """
    Push all test cases to JIRA
    """
    try:
        # Get all test cases from database
        test_cases_data = database_service.get_all_test_cases()
        
        if not test_cases_data["requirements"]:
            raise HTTPException(status_code=404, detail="No test cases found in the database")
        
        # Prepare records for JIRA
        records = []
        for req in test_cases_data["requirements"]:
            for tc in req["test_cases"]:
                records.append({
                    "requirement_id": req["req_title_id"],
                    "req_title": req["req_title"],
                    "req_description": req["requirement_description"],
                    "tc_id": tc["tc_id"],
                    "tc_title": tc["tc_title"],
                    "tc_description": f"Steps:\n{tc['tc_description']}\nExpected Result:\n{tc['expected_result']}\nInput Data:\n{tc['input_data']}",
                    "compliance_tags": tc["compliance_tags"],
                })
        
        # Push to JIRA
        jira_map = jira_service.push_traceability_parallel(records)
        # No need to update file status since we're handling all test cases
        
        return JiraPushResponse(
            message=f"Successfully pushed {len(records)} test cases to Jira",
            requirements_pushed=len(jira_map),
            jira_map=jira_map
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Jira push failed: {e}")


@router.get("/compliance-metrics", response_model=ComplianceMetrics)
def get_compliance_metrics():
    """
    Get compliance and risk metrics across all files (no file_id dependency)
    """
    try:
        metrics = database_service.get_compliance_metrics()
        return ComplianceMetrics(**metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch compliance metrics: {e}")
