"""
Custom exception classes
"""
from fastapi import HTTPException


class DocumentProcessingError(HTTPException):
    """Exception raised when document processing fails"""
    def __init__(self, detail: str):
        super().__init__(status_code=422, detail=f"Document processing failed: {detail}")


class AIServiceError(HTTPException):
    """Exception raised when AI service fails"""
    def __init__(self, detail: str):
        super().__init__(status_code=500, detail=f"AI service error: {detail}")


class DatabaseError(HTTPException):
    """Exception raised when database operations fail"""
    def __init__(self, detail: str):
        super().__init__(status_code=500, detail=f"Database error: {detail}")


class JiraIntegrationError(HTTPException):
    """Exception raised when JIRA integration fails"""
    def __init__(self, detail: str):
        super().__init__(status_code=500, detail=f"JIRA integration error: {detail}")
