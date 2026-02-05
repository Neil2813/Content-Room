"""
Media Router for ContentOS

Handles file uploads with S3 → Firebase → Local fallback.
"""
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from services.storage_service import get_storage_service, UploadError

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadResponse(BaseModel):
    """Response for file upload."""
    success: bool
    url: str
    key: str
    provider: str
    size: int
    content_type: str


class StorageStatusResponse(BaseModel):
    """Response for storage status."""
    providers: dict


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form(default="uploads"),
    preferred_provider: Optional[str] = Form(default=None),
):
    """
    Upload a file to storage.
    
    Files are stored using the priority: S3 → Firebase → Local.
    
    Args:
        file: The file to upload
        folder: Folder to store in (default: "uploads")
        preferred_provider: Optionally specify "s3", "firebase", or "local"
    
    Returns:
        Upload result with URL and metadata
    """
    storage = get_storage_service()
    
    try:
        # Read file contents
        file_data = await file.read()
        
        if not file_data:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Validate file size (max 50MB)
        max_size = 50 * 1024 * 1024
        if len(file_data) > max_size:
            raise HTTPException(status_code=413, detail="File too large (max 50MB)")
        
        # Upload
        result = await storage.upload(
            file_data=file_data,
            filename=file.filename or "unnamed",
            content_type=file.content_type,
            folder=folder,
            preferred_provider=preferred_provider,
        )
        
        return UploadResponse(
            success=True,
            url=result["url"],
            key=result["key"],
            provider=result["provider"],
            size=result["size"],
            content_type=result["content_type"],
        )
        
    except UploadError as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("/status", response_model=StorageStatusResponse)
async def storage_status():
    """Get storage provider status."""
    storage = get_storage_service()
    return StorageStatusResponse(providers=storage.get_status())


@router.delete("/{provider}/{file_key:path}")
async def delete_file(provider: str, file_key: str):
    """
    Delete a file from storage.
    
    Args:
        provider: Storage provider ("s3", "firebase", "local")
        file_key: File key/path
    """
    storage = get_storage_service()
    
    success = await storage.delete(file_key, provider)
    if success:
        return {"message": "File deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="File not found or delete failed")
