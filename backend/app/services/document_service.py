"""
Document parsing and processing service
"""
import os
import json
import tempfile
from typing import Dict, Any
from io import BytesIO
import PyPDF2
from docx import Document
from app.core.exceptions import DocumentProcessingError


class DocumentService:
    """Service for parsing various document formats"""
    
    @staticmethod
    def flatten_json(data: Dict[Any, Any]) -> str:
        """Convert JSON data to flattened text string"""
        if isinstance(data, dict):
            text_parts = []
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    text_parts.append(DocumentService.flatten_json(value))
                else:
                    text_parts.append(str(value))
            return " ".join(text_parts)
        elif isinstance(data, list):
            return " ".join([DocumentService.flatten_json(item) for item in data])
        else:
            return str(data)
    
    @staticmethod
    def parse_pdf(file_bytes: bytes) -> Dict[str, Any]:
        """Parse PDF file and extract text"""
        try:
            pdf_file = BytesIO(file_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            pages = []
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                pages.append({
                    "page": page_num + 1,
                    "items": [{"type": "text", "content": text}]
                })
            
            return {"pages": pages}
        except Exception as e:
            raise DocumentProcessingError(f"PDF parsing failed: {str(e)}")
    
    @staticmethod
    def parse_word(file_bytes: bytes) -> Dict[str, Any]:
        """Parse Word document and extract text"""
        try:
            # Create temporary file for docx parsing
            with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
                tmp.write(file_bytes)
                tmp.flush()
                
                doc = Document(tmp.name)
                text_content = []
                
                for paragraph in doc.paragraphs:
                    if paragraph.text.strip():
                        text_content.append(paragraph.text)
                
                # Clean up temp file
                os.unlink(tmp.name)
                
                full_text = "\n".join(text_content)
                return {
                    "pages": [{"page": 1, "items": [{"type": "text", "content": full_text}]}]
                }
        except Exception as e:
            raise DocumentProcessingError(f"Word document parsing failed: {str(e)}")
    
    @staticmethod
    def parse_xml(file_bytes: bytes) -> Dict[str, Any]:
        """Parse XML file and extract text"""
        try:
            import xml.etree.ElementTree as ET
            
            # Create temporary file for XML parsing
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xml') as tmp:
                tmp.write(file_bytes)
                tmp.flush()
                
                tree = ET.parse(tmp.name)
                root = tree.getroot()
                
                def extract_text_from_element(element):
                    text = element.text or ""
                    for child in element:
                        text += " " + extract_text_from_element(child)
                    return text.strip()
                
                content = extract_text_from_element(root)
                
                # Clean up temp file
                os.unlink(tmp.name)
                
                return {
                    "pages": [{"page": 1, "items": [{"type": "text", "content": content}]}]
                }
        except Exception as e:
            raise DocumentProcessingError(f"XML parsing failed: {str(e)}")
    
    @staticmethod
    def parse_markup(file_bytes: bytes) -> Dict[str, Any]:
        """Parse markup files (HTML, MD, TXT) and extract text"""
        try:
            content = file_bytes.decode('utf-8')
            return {
                "pages": [{"page": 1, "items": [{"type": "text", "content": content}]}]
            }
        except Exception as e:
            raise DocumentProcessingError(f"Markup parsing failed: {str(e)}")
    
    @staticmethod
    def extract_text_from_bytes(filename: str, file_bytes: bytes) -> str:
        """
        Extract and flatten text from uploaded file bytes
        """
        ext = os.path.splitext(filename)[1].lower()
        
        try:
            if ext == ".pdf":
                parsed = DocumentService.parse_pdf(file_bytes)
            elif ext == ".docx":
                parsed = DocumentService.parse_word(file_bytes)
            elif ext == ".xml":
                parsed = DocumentService.parse_xml(file_bytes)
            elif ext in (".html", ".htm", ".md", ".txt"):
                parsed = DocumentService.parse_markup(file_bytes)
            else:
                # Try markup parsing as fallback
                parsed = DocumentService.parse_markup(file_bytes)
            
            return DocumentService.flatten_json(parsed)
            
        except DocumentProcessingError:
            raise
        except Exception as e:
            raise DocumentProcessingError(f"Unsupported file type {ext}: {str(e)}")


# Global document service instance
document_service = DocumentService()
