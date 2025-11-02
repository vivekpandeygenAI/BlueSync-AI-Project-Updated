"""
JIRA integration service
"""
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from jira import JIRA
from app.core.config import settings
from app.core.exceptions import JiraIntegrationError


class JiraService:
    """Service for JIRA integration"""
    
    def __init__(self):
        self.jira_client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize JIRA client"""
        if not all([settings.JIRA_BASE, settings.JIRA_EMAIL, settings.JIRA_API_TOKEN]):
            print("JIRA credentials not configured")
            return
        
        try:
            self.jira_client = JIRA(
                server=settings.JIRA_BASE,
                basic_auth=(settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
            )
        except Exception as e:
            print(f"Failed to initialize JIRA client: {e}")
    
    def push_traceability_parallel(self, records: List[Dict]) -> Dict[str, str]:
        """
        Push requirements and test cases to JIRA in parallel
        Returns mapping of requirement_id -> JIRA issue key
        """
        if not self.jira_client:
            raise JiraIntegrationError("JIRA client not initialized")
        
        # Group records by requirement_id
        grouped = {}
        for rec in records:
            grouped.setdefault(rec["requirement_id"], []).append(rec)
        
        req_map = {}
        with ThreadPoolExecutor(max_workers=settings.MAX_JIRA_WORKERS) as executor:
            futures = {
                executor.submit(self._push_requirement_to_jira, rid, recs): rid 
                for rid, recs in grouped.items()
            }
            
            for fut in as_completed(futures):
                rid = futures[fut]
                try:
                    requirement_id, jira_key = fut.result()
                    req_map[requirement_id] = jira_key
                except Exception as e:
                    print(f"[ERROR] Requirement {rid} failed: {e}")
        
        return req_map
    
    def _push_requirement_to_jira(self, requirement_id: str, records: List[Dict]) -> tuple:
        """
        Create one JIRA requirement issue with test case subtasks
        Returns (requirement_id, jira_issue_key)
        """
        if not records:
            raise JiraIntegrationError("No records provided")
        
        first = records[0]
        
        # Create parent requirement issue
        issue_dict = {
            "project": {"key": settings.JIRA_PROJECT_KEY},
            "summary": f"{first['requirement_id']} - {first['req_title'][:100]}",
            "description": first['req_description'],
            "issuetype": {"name": settings.JIRA_REQ_ISSUE_TYPE},
        }
        
        try:
            issue = self.jira_client.create_issue(fields=issue_dict)
            parent_key = issue.key
            print(f"[JIRA] Created Requirement {requirement_id} -> {parent_key}")
            
            # Create test case subtasks
            for rec in records:
                subtask_dict = {
                    "project": {"key": settings.JIRA_PROJECT_KEY},
                    "parent": {"key": parent_key},
                    "summary": f"TC: {rec['tc_id']} - {rec['tc_title'][:100]}",
                    "description": rec["tc_description"],
                    "issuetype": {"name": settings.JIRA_TC_SUBTASK_TYPE},
                }
                
                subtask = self.jira_client.create_issue(fields=subtask_dict)
                print(f"[JIRA] Created TestCase {rec['tc_id']} -> {subtask.key}")
            
            return (requirement_id, parent_key)
            
        except Exception as e:
            raise JiraIntegrationError(f"Failed to create JIRA issues: {str(e)}")


# Global JIRA service instance
jira_service = JiraService()
