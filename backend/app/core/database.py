"""
Database connection and initialization
"""
import os
from google.cloud import bigquery
from app.core.config import settings

# Global BigQuery client
bq_client: bigquery.Client = None


def init_bigquery_client():
    """Initialize BigQuery client with proper credentials"""
    global bq_client
    
    # Set credentials if provided
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS
    
    bq_client = bigquery.Client(
        project=settings.GCP_PROJECT_ID,
        location=settings.VERTEX_LOCATION
    )
    
    return bq_client


def get_bigquery_client() -> bigquery.Client:
    """Get the BigQuery client instance"""
    global bq_client
    if bq_client is None:
        bq_client = init_bigquery_client()
    return bq_client
