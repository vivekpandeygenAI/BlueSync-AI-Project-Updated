"""
Database service for BigQuery operations
"""
import json
import uuid
from typing import List, Dict, Optional
from datetime import datetime
from io import BytesIO
from google.cloud import bigquery
from app.core.database import get_bigquery_client
from app.core.config import settings
from app.core.exceptions import DatabaseError


class DatabaseService:
    def get_test_case_description(self, requirement_id: str, tc_id: str) -> Optional[str]:
        """Fetch original test case description from BigQuery"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.test_cases"
            query = f"SELECT tc_description FROM `{table_id}` WHERE req_id = @requirement_id AND tc_id = @tc_id LIMIT 1"
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("requirement_id", "STRING", requirement_id),
                    bigquery.ScalarQueryParameter("tc_id", "STRING", tc_id)
                ]
            )
            rows = list(self.client.query(query, job_config=job_config))
            return rows[0].tc_description if rows else None
        except Exception as e:
            raise DatabaseError(f"Failed to fetch test case description: {str(e)}")
    def update_test_case_description(self, requirement_id: str, tc_id: str, improved_description: str):
        """Update test case description in BigQuery"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.test_cases"
            query = f"""
                UPDATE `{table_id}`
                SET tc_description = @improved_description
                WHERE req_id = @requirement_id AND tc_id = @tc_id
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("improved_description", "STRING", improved_description),
                    bigquery.ScalarQueryParameter("requirement_id", "STRING", requirement_id),
                    bigquery.ScalarQueryParameter("tc_id", "STRING", tc_id)
                ]
            )
            self.client.query(query, job_config=job_config)
            print(f"Updated test case description for requirement_id={requirement_id}, tc_id={tc_id}")
        except Exception as e:
            raise DatabaseError(f"Failed to update test case description: {str(e)}")
    """Service for BigQuery database operations"""
    
    def __init__(self):
        self.client = get_bigquery_client()
        self.project_id = settings.GCP_PROJECT_ID
        self.dataset = settings.BIGQUERY_DATASET
    
    def save_file(self, file_id: str, filenames: str, extracted_data: str, input_data: str):
        """Save file information to BigQuery"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.files"
            
            rows = [{
                "id": file_id,
                "filename": filenames,
                "extracted_data": extracted_data,
                "input_data": input_data,
                "status": "Ingestion"
            }]
            
            self._load_json_data(table_id, rows)
            print(f"Inserted file record for {file_id}")
            
        except Exception as e:
            raise DatabaseError(f"Failed to save file: {str(e)}")
    
    def update_file_status(self, file_id: str, new_status: str):
        """Update file status in BigQuery"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.files"
            
            query = f"""
                UPDATE `{table_id}`
                SET status = @new_status
                WHERE id = @file_id
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("new_status", "STRING", new_status),
                    bigquery.ScalarQueryParameter("file_id", "STRING", file_id),
                ]
            )
            
            query_job = self.client.query(query, job_config=job_config)
            query_job.result()
            
            print(f"Updated status for file_id={file_id} to '{new_status}'")
            
        except Exception as e:
            raise DatabaseError(f"Failed to update file status: {str(e)}")
    
    def get_files(self) -> List[Dict]:
        """Get all uploaded files"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.files"
            query = f"SELECT id, filename, status FROM `{table_id}` ORDER BY filename"
            
            query_job = self.client.query(query)
            rows = list(query_job)
            
            return [
                {"file_id": row.id, "filename": row.filename, "status": row.status}
                for row in rows
            ]
            
        except Exception as e:
            raise DatabaseError(f"Failed to fetch files: {str(e)}")
    
    def get_file_data(self, file_id: str) -> Optional[str]:
        """Get extracted data for a file"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.files"
            query = f"SELECT extracted_data FROM `{table_id}` WHERE id = @file_id LIMIT 1"
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("file_id", "STRING", file_id)]
            )
            
            query_job = self.client.query(query, job_config=job_config)
            rows = list(query_job)
            
            return rows[0].extracted_data if rows else None
            
        except Exception as e:
            raise DatabaseError(f"Failed to fetch file data: {str(e)}")
    
    def get_input_data(self, file_id: str) -> str:
        """Get input data for a file"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.files"
            query = f"SELECT input_data FROM `{table_id}` WHERE id = @file_id LIMIT 1"
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("file_id", "STRING", file_id)]
            )
            
            query_job = self.client.query(query, job_config=job_config)
            rows = list(query_job)
            
            return rows[0].input_data if rows and hasattr(rows[0], "input_data") else ""
            
        except Exception as e:
            return ""
    
    def save_requirements(self, requirements_data: List[Dict]):
        """Save requirements to BigQuery"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.requirements"
            self._load_json_data(table_id, requirements_data)
            print(f"Inserted {len(requirements_data)} requirements")
            
        except Exception as e:
            raise DatabaseError(f"Failed to save requirements: {str(e)}")
    
    def get_requirements(self) -> List[Dict]:
        """Get all requirements (no file_id dependency)"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.requirements"

            query = f"""
                SELECT requirement_id, req_title_id, title, description, file_id, 
                       type, source, category, priority 
                FROM `{table_id}` 
                ORDER BY req_title_id
            """
            query_job = self.client.query(query)

            rows = list(query_job)
            return [
                {
                    "file_id": r.file_id,
                    "requirement_id": r.requirement_id,
                    "req_title_id": r.req_title_id,
                    "title": r.title,
                    "description": r.description,
                    "type": r.type,
                    "source": r.source,
                    "category": r.category,
                    "priority": r.priority
                }
                for r in rows
            ]

        except Exception as e:
            raise DatabaseError(f"Failed to fetch requirements: {str(e)}")
    
    def save_test_cases(self, test_cases: List[Dict]):
        """Save test cases to BigQuery"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.test_cases"
            
            # Ensure all required fields are present
            rows = []
            for tc in test_cases:
                rows.append({
                    "file_id": tc.get("file_id", "") or "",
                    "req_id": tc.get("req_id", "") or "",
                    "req_title_id": tc.get("req_title_id", "") or "",
                    "req_title": tc.get("req_title", "") or "",
                    "req_description": tc.get("req_description", "") or "",
                    "tc_id": tc.get("tc_id", "") or "",
                    "tc_title": tc.get("tc_title", "") or "",
                    "tc_description": tc.get("tc_description", "") or "",
                    "expected_result": tc.get("expected_result", "") or "",
                    "input_data": tc.get("input_data", "") or "",
                    "compliance_tags": tc.get("compliance_tags", "") or "",
                    "risk": tc.get("risk", "") or "",
                    "created_at": tc.get("created_at") or datetime.now().isoformat(),
                })
            
            self._load_json_data(table_id, rows)
            print(f"Inserted {len(rows)} test cases")
            
        except Exception as e:
            raise DatabaseError(f"Failed to save test cases: {str(e)}")
    
    def get_test_cases_by_file(self, file_id: str ) -> Dict:
        """Get test cases grouped by requirement for a file"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.test_cases"
            query = f"""
                SELECT * 
                FROM `{table_id}`
                ORDER BY req_id, tc_id
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("file_id", "STRING", file_id)]
            )
            
            rows = list(self.client.query(query, job_config=job_config))
            
            requirements = {}
            for r in rows:
                if r.req_id not in requirements:
                    requirements[r.req_id] = {
                        "requirement_id": r.req_id,
                        "req_title_id": r.req_title_id,
                        "req_title": r.req_title,
                        "requirement_description": r.req_description,
                        "test_cases": []
                    }
                
                requirements[r.req_id]["test_cases"].append({
                    "tc_id": r.tc_id,
                    "tc_title": r.tc_title,
                    "tc_description": r.tc_description,
                    "expected_result": r.expected_result,
                    "input_data": r.input_data,
                    "compliance_tags": r.compliance_tags,
                    "risk": r.risk,
                    "created_at": r.created_at,
                })
            
            return {"file_id": file_id, "requirements": list(requirements.values())}
            
        except Exception as e:
            raise DatabaseError(f"Failed to fetch test cases for file: {str(e)}")

    def get_all_test_cases(self) -> List[Dict]:
        """Get a flat list of all test cases across all files"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.test_cases"
            query = f"""
                SELECT *
                FROM `{table_id}`
                ORDER BY req_id, tc_id
            """

            query_job = self.client.query(query)
            rows = list(query_job)

            return [
                {
                    "file_id": r.file_id,
                    "req_id": r.req_id,
                    "req_title_id": r.req_title_id,
                    "req_title": r.req_title,
                    "req_description": r.req_description,
                    "tc_id": r.tc_id,
                    "tc_title": r.tc_title,
                    "tc_description": r.tc_description,
                    "expected_result": r.expected_result,
                    "input_data": r.input_data,
                    "compliance_tags": r.compliance_tags,
                    "risk": r.risk,
                    "created_at": r.created_at,
                }
                for r in rows
            ]

        except Exception as e:
            raise DatabaseError(f"Failed to fetch all test cases: {str(e)}")

    def get_compliance_metrics(self) -> Dict:
        """Get compliance and risk metrics across all files"""
        try:
            table_id = f"{self.project_id}.{self.dataset}.test_cases"

            # Select all test cases across all files
            query = f"""
                SELECT compliance_tags, risk, created_at
                FROM `{table_id}`
            """

            query_job = self.client.query(query)
            rows = list(query_job)

            if not rows:
                return {
                    "file_id": "all",
                    "total_test_cases": 0,
                    "compliance_tags": [],
                    "compliance_counts": {},
                    "risk_counts": {},
                    "last_updated": None,
                    "test_cases": []  # Always return test_cases key for UI compatibility
                }

            total_test_cases = len(rows)
            compliance_counts = {}
            risk_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
            all_tags = set()
            last_updated = None
            test_cases = []

            for r in rows:
                raw_tags = r.compliance_tags or ""
                # Support tags separated by '|' or comma
                tags = [t.strip() for part in raw_tags.split("|") for t in part.split(",") if t.strip()]
                for tag in tags:
                    compliance_counts[tag] = compliance_counts.get(tag, 0) + 1
                    all_tags.add(tag)

                risk = (r.risk or "Low").capitalize()
                if risk in risk_counts:
                    risk_counts[risk] += 1

                if r.created_at:
                    try:
                        dt = datetime.fromisoformat(r.created_at)
                        if not last_updated or dt > last_updated:
                            last_updated = dt
                    except Exception:
                        pass

                # Add each test case for UI filtering
                test_cases.append({
                    "compliance_tags": tags,
                    "risk": r.risk,
                    "created_at": r.created_at
                })

            return {
                "file_id": "all",  # Always return "all" since we're showing aggregated metrics
                "total_test_cases": total_test_cases,
                "compliance_tags": sorted(list(all_tags)),
                "compliance_counts": compliance_counts,
                "risk_counts": risk_counts,
                "last_updated": last_updated.isoformat() if last_updated else None,
                "test_cases": test_cases  # Provide test_cases for UI filtering
            }
        except Exception as e:
            raise DatabaseError(f"Failed to fetch compliance metrics: {str(e)}")
    
    def _load_json_data(self, table_id: str, rows: List[Dict]):
        """Load JSON data into BigQuery table"""
        json_data = "\n".join(json.dumps(row) for row in rows)
        file_obj = BytesIO(json_data.encode("utf-8"))
        
        job = self.client.load_table_from_file(
            file_obj,
            table_id,
            job_config=bigquery.LoadJobConfig(
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
                write_disposition="WRITE_APPEND"
            )
        )
        job.result()


# Global database service instance
database_service = DatabaseService()
