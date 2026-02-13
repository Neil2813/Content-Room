from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.user import User
from models.content import Content, ContentType, ModerationStatus
from routers.auth import get_current_user
from services.competitor_service import CompetitorService

router = APIRouter(tags=["Competitor"])

class CompetitorRequest(BaseModel):
    url: str
    niche: str

class CompetitorResponse(BaseModel):
    analysis: str
    url_found: bool

@router.post("/analyze", response_model=CompetitorResponse)
async def analyze_competitor_gaps(
    request: CompetitorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyzes a given competitor's URL (social profile, blog) and returns a gap analysis.
    Uses basic web scraping + LLM to identify opportunities.
    """
    service = CompetitorService()
    try:
        # Note: In a real app, this should be an async call, but the service uses async methods
        analysis_result = await service.analyze_competitor_gaps(request.url, request.niche)
        
        # Save to history
        content_item = Content(
            user_id=current_user.id,
            content_type="competitor_analysis",
            original_text=f"Analyzed competitor: {request.url} in niche: {request.niche}",
            summary=analysis_result,
            caption=f"Competitor Analysis: {request.url}",
            moderation_status=ModerationStatus.SAFE.value, # Analysis is safe by default
            created_at=datetime.utcnow()
        )
        db.add(content_item)
        await db.commit()
        await db.refresh(content_item)
        
        return CompetitorResponse(
            analysis=analysis_result,
            url_found=True
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
