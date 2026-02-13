from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.user import User
from models.content import Content, ModerationStatus
from routers.auth import get_current_user
from services.calendar_service import CalendarService

router = APIRouter(tags=["Content Calendar"])

class CalendarRequest(BaseModel):
    month: str
    year: int
    niche: str
    goals: str

class CalendarResponse(BaseModel):
    calendar_markdown: str

@router.post("/generate", response_model=CalendarResponse)
async def generate_calendar(
    request: CalendarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a monthly content calendar based on niche and Indian festivals.
    """
    service = CalendarService()
    try:
        # Validate month
        valid_months = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"]
        if request.month not in valid_months:
            raise HTTPException(status_code=400, detail="Invalid month. Use full English name (e.g. January).")
            
        calendar_text = await service.generate_calendar(request.month, request.year, request.niche, request.goals)
        
        # Save to history
        content_item = Content(
            user_id=current_user.id,
            content_type="content_calendar",
            original_text=f"Generated calendar for {request.month} {request.year}. Niche: {request.niche}. Goals: {request.goals}",
            summary=calendar_text,
            caption=f"Content Calendar: {request.month} {request.year}",
            moderation_status=ModerationStatus.SAFE.value,
            created_at=datetime.utcnow()
        )
        db.add(content_item)
        await db.commit()
        await db.refresh(content_item)
        
        return CalendarResponse(calendar_markdown=calendar_text)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
