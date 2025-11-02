"""
Pydantic models for request/response schemas
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# File upload schemas
class UploadResponse(BaseModel):
    file_id: str
    filename: str
    message: Optional[str] = None


class MultiUploadResponse(BaseModel):
    file_ids: List[str]
    filenames: List[str]
    message: Optional[str] = None


# File management schemas
class FileInfo(BaseModel):
    file_id: str
    filename: str
    status: str


# Requirement schemas
class RequirementBase(BaseModel):
    title: str
    description: str
    type: str = "Functional"
    source: str = "AI Extracted"
    category: str = ""
    priority: str = "Medium"


class RequirementCreate(RequirementBase):
    file_id: str


class RequirementResponse(RequirementBase):
    file_id: str
    requirement_id: str
    req_title_id: str
    created_at: Optional[datetime] = None


# Test case schemas
class TestCaseBase(BaseModel):
    tc_id: str
    tc_title: str
    tc_description: str
    expected_result: str
    input_data: str = ""
    compliance_tags: str = ""
    risk: str = "Low"


class TestCaseCreate(TestCaseBase):
    file_id: str
    req_id: str
    req_title_id: str
    req_title: str
    req_description: str


class TestCaseResponse(TestCaseBase):
    file_id: str
    req_id: str
    req_title_id: str
    req_title: str
    req_description: str
    created_at: Optional[datetime] = None


# Test case improvement schema
class ImproveTestCaseRequest(BaseModel):
    file_id: str
    requirement_id: str
    tc_id: str
    original_description: str
    user_input: str

    class Config:
        validate_assignment = True


# JIRA integration schemas
class JiraPushResponse(BaseModel):
    message: str
    requirements_pushed: int
    jira_map: Dict[str, str]


# Compliance metrics schemas
class ComplianceMetrics(BaseModel):
    file_id: str
    total_test_cases: int
    compliance_tags: List[str]
    compliance_counts: Dict[str, int]
    risk_counts: Dict[str, int]
    last_updated: Optional[datetime] = None


# AI generation schemas
class RequirementExtractionResponse(BaseModel):
    message: str
    requirement_count: int
    requirements: List[RequirementResponse]


class TestCaseGenerationResponse(BaseModel):
    message: str
    total_testcases_generated: int
    elapsed_seconds: float
    per_requirement: Dict[str, Any]
