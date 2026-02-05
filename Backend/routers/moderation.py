"""
Moderation Router for ContentOS

Handles multimodal content moderation - NO AUTH REQUIRED.
- Text moderation
- Image moderation  
- Audio moderation
- Video moderation

Now saves results to database for analytics tracking.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from services.moderation_service import get_moderation_service
from database import get_db
from models.content import Content, ModerationStatus

logger = logging.getLogger(__name__)
router = APIRouter()

moderation = get_moderation_service()


class TextModerationRequest(BaseModel):
    """Request for text moderation."""
    text: str
    language: str = "en"
    save_to_db: bool = True  # Whether to save for analytics


class ModerationResponse(BaseModel):
    """Standard moderation response."""
    decision: str
    safety_score: float
    confidence: float
    explanation: str
    flags: list
    provider: str
    processing_time_ms: int


def get_moderation_status(decision: str, safety_score: float) -> str:
    """Convert moderation decision to ModerationStatus enum value."""
    if decision == "ESCALATE":
        return ModerationStatus.ESCALATED.value
    elif decision == "FLAG" or safety_score < 70:
        return ModerationStatus.WARNING.value if safety_score >= 40 else ModerationStatus.UNSAFE.value
    return ModerationStatus.SAFE.value


@router.post("/text", response_model=ModerationResponse)
async def moderate_text(
    request: TextModerationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Moderate text content for safety.
    Uses AWS Comprehend with LLM fallback.
    NO AUTHENTICATION REQUIRED.
    Saves results to database for analytics.
    """
    try:
        result = await moderation.moderate_text(request.text)
        
        # Save to database for analytics (user_id=1 for demo)
        if request.save_to_db:
            try:
                content = Content(
                    user_id=1,
                    content_type="text",
                    original_text=request.text[:500],  # Truncate for storage
                    moderation_status=get_moderation_status(result["decision"], result["safety_score"]),
                    safety_score=result["safety_score"],
                    moderation_flags=result.get("flags", []),
                )
                db.add(content)
                await db.commit()
            except Exception as db_error:
                logger.warning(f"Failed to save moderation to DB: {db_error}")
                await db.rollback()
        
        return ModerationResponse(
            decision=result["decision"],
            safety_score=result["safety_score"],
            confidence=result.get("confidence", 0.8),
            explanation=result.get("explanation", ""),
            flags=result.get("flags", []),
            provider=result.get("provider", "unknown"),
            processing_time_ms=result.get("processing_time_ms", 0),
        )
    except Exception as e:
        logger.error(f"Text moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image")
async def moderate_image(
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Moderate image content for safety.
    Uses AWS Rekognition with OpenCV fallback.
    NO AUTHENTICATION REQUIRED.
    Saves results to database for analytics.
    """
    try:
        image_bytes = await image.read()
        result = await moderation.moderate_image(image_bytes)
        
        # Save to database for analytics
        try:
            content = Content(
                user_id=1,
                content_type="image",
                original_text=f"Image: {image.filename}",
                moderation_status=get_moderation_status(result["decision"], result["safety_score"]),
                safety_score=result["safety_score"],
                moderation_flags=result.get("flags", []),
            )
            db.add(content)
            await db.commit()
        except Exception as db_error:
            logger.warning(f"Failed to save moderation to DB: {db_error}")
            await db.rollback()
        
        return {
            "filename": image.filename,
            **result,
        }
    except Exception as e:
        logger.error(f"Image moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio")
async def moderate_audio(
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Moderate audio content for safety.
    Transcribes audio and analyzes content.
    Uses Whisper + LLM for analysis.
    NO AUTHENTICATION REQUIRED.
    """
    try:
        audio_bytes = await audio.read()
        result = await moderation.moderate_audio(audio_bytes, audio.filename)
        
        # Save to database for analytics
        try:
            content = Content(
                user_id=1,
                content_type="audio",
                original_text=f"Audio: {audio.filename}",
                moderation_status=get_moderation_status(result["decision"], result["safety_score"]),
                safety_score=result["safety_score"],
                moderation_flags=result.get("flags", []),
            )
            db.add(content)
            await db.commit()
        except Exception as db_error:
            logger.warning(f"Failed to save moderation to DB: {db_error}")
            await db.rollback()
        
        return {
            "filename": audio.filename,
            **result,
        }
    except Exception as e:
        logger.error(f"Audio moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/video")
async def moderate_video(
    video: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Moderate video content for safety.
    Extracts frames and analyzes them for moderation.
    NO AUTHENTICATION REQUIRED.
    """
    import tempfile
    import os
    
    try:
        video_bytes = await video.read()
        
        # Save to temp file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(video.filename or ".mp4")[1]) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name
        
        try:
            import cv2
            import numpy as np
            
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail="Could not open video file")
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / fps if fps > 0 else 0
            
            # Extract frames at regular intervals (max 5 frames)
            frame_indices = []
            if total_frames <= 5:
                frame_indices = list(range(total_frames))
            else:
                step = total_frames // 5
                frame_indices = [i * step for i in range(5)]
            
            frame_results = []
            min_safety = 100
            all_flags = []
            
            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if ret:
                    # Encode frame to bytes
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_bytes = buffer.tobytes()
                    
                    # Analyze frame
                    frame_result = await moderation.moderate_image(frame_bytes)
                    frame_results.append({
                        "frame_index": idx,
                        "timestamp": idx / fps if fps > 0 else 0,
                        "safety_score": frame_result["safety_score"],
                        "flags": frame_result.get("flags", []),
                    })
                    min_safety = min(min_safety, frame_result["safety_score"])
                    all_flags.extend(frame_result.get("flags", []))
            
            cap.release()
            
            # Combined decision
            if min_safety >= 70:
                decision = "ALLOW"
            elif min_safety >= 40:
                decision = "FLAG"
            else:
                decision = "ESCALATE"
            
            result = {
                "decision": decision,
                "safety_score": min_safety,
                "flags": list(set(all_flags)),
                "video_info": {
                    "duration_seconds": round(duration, 2),
                    "total_frames": total_frames,
                    "frames_analyzed": len(frame_results),
                },
                "frame_results": frame_results,
                "provider": "opencv_video",
            }
            
            # Save to database for analytics
            try:
                content = Content(
                    user_id=1,
                    content_type="video",
                    original_text=f"Video: {video.filename}",
                    moderation_status=get_moderation_status(decision, min_safety),
                    safety_score=min_safety,
                    moderation_flags=list(set(all_flags)),
                )
                db.add(content)
                await db.commit()
            except Exception as db_error:
                logger.warning(f"Failed to save moderation to DB: {db_error}")
                await db.rollback()
            
            return {
                "filename": video.filename,
                **result,
            }
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/multimodal")
async def moderate_multimodal(
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
):
    """
    Moderate multiple content types at once.
    Combines results from all provided content types.
    NO AUTHENTICATION REQUIRED.
    """
    results = {}
    overall_safety = 100
    all_flags = []
    
    if text:
        text_result = await moderation.moderate_text(text)
        results["text"] = text_result
        overall_safety = min(overall_safety, text_result["safety_score"])
        all_flags.extend(text_result.get("flags", []))
    
    if image:
        image_bytes = await image.read()
        image_result = await moderation.moderate_image(image_bytes)
        results["image"] = image_result
        overall_safety = min(overall_safety, image_result["safety_score"])
        all_flags.extend(image_result.get("flags", []))
    
    if audio:
        audio_bytes = await audio.read()
        audio_result = await moderation.moderate_audio(audio_bytes, audio.filename)
        results["audio"] = audio_result
        overall_safety = min(overall_safety, audio_result["safety_score"])
        all_flags.extend(audio_result.get("flags", []))
    
    if not results:
        raise HTTPException(
            status_code=400,
            detail="At least one content type (text, image, or audio) is required"
        )
    
    # Combined decision
    if overall_safety >= 70:
        decision = "ALLOW"
    elif overall_safety >= 40:
        decision = "FLAG"
    else:
        decision = "ESCALATE"
    
    return {
        "decision": decision,
        "overall_safety_score": overall_safety,
        "combined_flags": list(set(all_flags)),
        "results": results,
    }
