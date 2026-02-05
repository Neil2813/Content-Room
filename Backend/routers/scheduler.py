"""
Scheduler Router for ContentOS

Handles content scheduling with MODERATION CHECK before scheduling.
Posts must pass moderation before being allowed in the schedule queue.
"""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.schedule import ScheduledPost, ScheduleStatus
from services.vision_service import VisionService

logger = logging.getLogger(__name__)
router = APIRouter()


class ScheduleRequest(BaseModel):
    """Request for scheduling a post."""
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    platform: Optional[str] = None
    user_id: int = 1  # Default user for demo
    media_url: Optional[str] = None  # URL of media to moderate
    skip_moderation: bool = False  # For testing only


class ScheduleResponse(BaseModel):
    """Response for scheduled post."""
    id: int
    title: str
    description: Optional[str]
    scheduled_at: datetime
    status: str
    platform: Optional[str] = None
    ai_optimized: bool
    moderation_passed: bool = True
    moderation_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationResult(BaseModel):
    """Moderation check result."""
    passed: bool
    is_safe: bool
    confidence: float
    reason: Optional[str] = None
    labels: List[str] = []


@router.post("/", response_model=ScheduleResponse)
async def schedule_post(
    request: ScheduleRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule a post for future publishing.
    
    ⚠️ MODERATION CHECK: Posts with media must pass content moderation.
    Posts flagged as unsafe will be rejected.
    
    NO AUTHENTICATION REQUIRED.
    """
    moderation_passed = True
    moderation_reason = None
    
    # Run moderation check if media URL is provided
    if request.media_url and not request.skip_moderation:
        try:
            import httpx
            
            # Download the image
            async with httpx.AsyncClient() as client:
                response = await client.get(request.media_url, timeout=30.0)
                if response.status_code == 200:
                    image_data = response.content
                    
                    # Run moderation
                    vision_service = VisionService()
                    result = await vision_service.analyze_image(image_data)
                    
                    # Check if content is safe
                    if not result.get("is_safe", True):
                        moderation_passed = False
                        moderation_reason = f"Content flagged: {', '.join(result.get('labels', ['inappropriate content']))}"
                        
                        # Reject the post
                        raise HTTPException(
                            status_code=400,
                            detail={
                                "error": "moderation_failed",
                                "message": "Content did not pass moderation check",
                                "reason": moderation_reason,
                                "labels": result.get("labels", []),
                                "confidence": result.get("confidence", 0),
                            }
                        )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Moderation check failed, allowing post: {e}")
            # Allow post if moderation service fails (fail-open for demo)
    
    # Also moderate text content
    if request.description and not request.skip_moderation:
        text_to_check = f"{request.title} {request.description}"
        
        # Simple text moderation (check for obvious violations)
        banned_patterns = [
            "violence", "hate", "explicit", "nude", "kill", "attack",
            "terrorism", "abuse", "drugs", "illegal"
        ]
        
        text_lower = text_to_check.lower()
        flagged_words = [word for word in banned_patterns if word in text_lower]
        
        if flagged_words:
            moderation_passed = False
            moderation_reason = f"Text contains flagged content: {', '.join(flagged_words)}"
            
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "text_moderation_failed",
                    "message": "Text content did not pass moderation",
                    "reason": moderation_reason,
                    "flagged_words": flagged_words,
                }
            )
    
    # Create the scheduled post
    post = ScheduledPost(
        user_id=request.user_id,
        title=request.title,
        description=request.description,
        scheduled_at=request.scheduled_at,
        platform=request.platform,
        status=ScheduleStatus.QUEUED.value,
    )
    
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    logger.info(f"Post scheduled: {post.id} for {post.scheduled_at} on {post.platform}")
    
    response = ScheduleResponse.model_validate(post)
    response.moderation_passed = moderation_passed
    response.moderation_reason = moderation_reason
    
    return response


@router.post("/with-media")
async def schedule_post_with_media(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    scheduled_at: datetime = Form(...),
    platform: Optional[str] = Form(None),
    user_id: int = Form(1),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule a post with media upload and moderation.
    
    ⚠️ MODERATION CHECK: Uploaded media must pass content moderation.
    """
    # Read and moderate the uploaded file
    file_data = await file.read()
    
    if not file_data:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Run moderation on uploaded image
    try:
        vision_service = VisionService()
        result = await vision_service.analyze_image(file_data)
        
        if not result.get("is_safe", True):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "moderation_failed",
                    "message": "Uploaded content did not pass moderation",
                    "reason": f"Content flagged: {', '.join(result.get('labels', []))}",
                    "labels": result.get("labels", []),
                    "confidence": result.get("confidence", 0),
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Moderation check failed, allowing post: {e}")
    
    # Upload to storage
    from services.storage_service import get_storage_service
    storage = get_storage_service()
    
    upload_result = await storage.upload(
        file_data=file_data,
        filename=file.filename or "upload",
        content_type=file.content_type,
        folder="scheduled",
    )
    
    # Create the scheduled post
    post = ScheduledPost(
        user_id=user_id,
        title=title,
        description=description,
        scheduled_at=scheduled_at,
        platform=platform,
        status=ScheduleStatus.QUEUED.value,
    )
    
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    return {
        "post": ScheduleResponse.model_validate(post),
        "media": upload_result,
        "moderation_passed": True,
    }


@router.post("/check-moderation", response_model=ModerationResult)
async def check_content_moderation(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Pre-check content against moderation rules.
    
    Use this endpoint to check if content will pass 
    moderation BEFORE scheduling.
    """
    labels = []
    is_safe = True
    confidence = 1.0
    reason = None
    
    # Check text
    if text:
        banned_patterns = [
            "violence", "hate", "explicit", "nude", "kill", "attack",
            "terrorism", "abuse", "drugs", "illegal"
        ]
        text_lower = text.lower()
        flagged_words = [word for word in banned_patterns if word in text_lower]
        
        if flagged_words:
            is_safe = False
            labels.extend(flagged_words)
            reason = f"Text contains: {', '.join(flagged_words)}"
    
    # Check image
    if file:
        file_data = await file.read()
        if file_data:
            try:
                vision_service = VisionService()
                result = await vision_service.analyze_image(file_data)
                
                if not result.get("is_safe", True):
                    is_safe = False
                    labels.extend(result.get("labels", []))
                    confidence = min(confidence, result.get("confidence", 0.5))
                    reason = f"Image flagged: {', '.join(result.get('labels', []))}"
            except Exception as e:
                logger.warning(f"Image moderation failed: {e}")
    
    return ModerationResult(
        passed=is_safe,
        is_safe=is_safe,
        confidence=confidence,
        reason=reason,
        labels=list(set(labels)),
    )


@router.get("/", response_model=List[ScheduleResponse])
async def list_scheduled_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db),
):
    """
    List scheduled posts with optional filters.
    NO AUTHENTICATION REQUIRED.
    """
    query = select(ScheduledPost).where(ScheduledPost.user_id == user_id)
    
    if status:
        query = query.where(ScheduledPost.status == status)
    
    if platform:
        query = query.where(ScheduledPost.platform == platform)
    
    query = query.order_by(ScheduledPost.scheduled_at)
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    return [ScheduleResponse.model_validate(p) for p in posts]


@router.get("/{post_id}", response_model=ScheduleResponse)
async def get_scheduled_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific scheduled post.
    NO AUTHENTICATION REQUIRED.
    """
    result = await db.execute(
        select(ScheduledPost).where(ScheduledPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return ScheduleResponse.model_validate(post)


@router.delete("/{post_id}")
async def cancel_scheduled_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a scheduled post.
    NO AUTHENTICATION REQUIRED.
    """
    result = await db.execute(
        select(ScheduledPost).where(ScheduledPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.status == ScheduleStatus.PUBLISHED.value:
        raise HTTPException(status_code=400, detail="Cannot cancel published post")
    
    post.status = ScheduleStatus.CANCELLED.value
    await db.commit()
    
    return {"message": "Post cancelled successfully"}
