"""
Content Router for Content Room

My Content pipeline: list, get, create draft.
Supports workflow: Create -> Moderate -> Translate -> Schedule.
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models.content import Content, ModerationStatus
from models.schedule import ScheduledPost
from models.user import User
from routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ContentCreate(BaseModel):
    """Create a content draft (from Studio or first step)."""
    content_type: str = Field(default="text", description="text, image, audio, video")
    original_text: Optional[str] = None
    caption: Optional[str] = None
    summary: Optional[str] = None
    hashtags: Optional[List[str]] = None
    file_path: Optional[str] = None


class ContentItem(BaseModel):
    """Single content item for list/detail."""
    id: int
    content_type: str
    original_text: Optional[str] = None
    caption: Optional[str] = None
    summary: Optional[str] = None
    hashtags: Optional[dict] = None
    translated_text: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    moderation_status: str
    safety_score: Optional[float] = None
    moderation_explanation: Optional[str] = None
    workflow_status: str  # draft | moderated | translated | scheduled
    is_scheduled: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def _workflow_status(content: Content, is_scheduled: bool) -> str:
    if is_scheduled:
        return "scheduled"
    if content.translated_text:
        return "translated"
    if content.moderation_status and content.moderation_status != ModerationStatus.PENDING.value and content.safety_score is not None:
        return "moderated"
    return "draft"


# ---------------------------------------------------------------------------
# List & Get
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[ContentItem])
async def list_content(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List current user's content (My Content).
    Optional ?status_filter=draft|moderated|translated|scheduled.
    """
    query = select(Content).where(Content.user_id == current_user.id).order_by(Content.updated_at.desc())
    result = await db.execute(query)
    contents = result.scalars().all()

    # Resolve which items are scheduled
    content_ids = [c.id for c in contents]
    scheduled_query = select(ScheduledPost.content_id).where(
        ScheduledPost.content_id.in_(content_ids),
        ScheduledPost.content_id.isnot(None),
    )
    scheduled_result = await db.execute(scheduled_query)
    scheduled_ids = {row[0] for row in scheduled_result.all() if row[0] is not None}

    out = []
    for c in contents:
        is_sched = c.id in scheduled_ids
        ws = _workflow_status(c, is_sched)
        if status_filter and ws != status_filter:
            continue
        out.append(ContentItem(
            id=c.id,
            content_type=c.content_type,
            original_text=c.original_text,
            caption=c.caption,
            summary=c.summary,
            hashtags=c.hashtags,
            translated_text=c.translated_text,
            source_language=c.source_language,
            target_language=c.target_language,
            moderation_status=c.moderation_status,
            safety_score=c.safety_score,
            moderation_explanation=c.moderation_explanation,
            workflow_status=ws,
            is_scheduled=is_sched,
            created_at=c.created_at.isoformat() if c.created_at else "",
            updated_at=c.updated_at.isoformat() if c.updated_at else "",
        ))
    return out


@router.get("/{content_id}", response_model=ContentItem)
async def get_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get one content item (own only)."""
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check if scheduled
    sched_result = await db.execute(
        select(ScheduledPost.id).where(
            ScheduledPost.content_id == content_id,
        ).limit(1)
    )
    is_scheduled = sched_result.scalar_one_or_none() is not None

    return ContentItem(
        id=content.id,
        content_type=content.content_type,
        original_text=content.original_text,
        caption=content.caption,
        summary=content.summary,
        hashtags=content.hashtags,
        translated_text=content.translated_text,
        source_language=content.source_language,
        target_language=content.target_language,
        moderation_status=content.moderation_status,
        safety_score=content.safety_score,
        moderation_explanation=content.moderation_explanation,
        workflow_status=_workflow_status(content, is_scheduled),
        is_scheduled=is_scheduled,
        created_at=content.created_at.isoformat() if content.created_at else "",
        updated_at=content.updated_at.isoformat() if content.updated_at else "",
    )


# ---------------------------------------------------------------------------
# Create draft
# ---------------------------------------------------------------------------

@router.post("/", response_model=ContentItem, status_code=status.HTTP_201_CREATED)
async def create_content(
    body: ContentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a content draft (e.g. from Studio after generating caption/summary/hashtags).
    Starts the pipeline: Create -> Moderate -> Translate -> Schedule.
    """
    hashtags_json = None
    if body.hashtags is not None:
        hashtags_json = {"items": body.hashtags} if isinstance(body.hashtags, list) else body.hashtags

    content = Content(
        user_id=current_user.id,
        content_type=body.content_type or "text",
        original_text=body.original_text,
        caption=body.caption,
        summary=body.summary,
        hashtags=hashtags_json,
        file_path=body.file_path,
        moderation_status=ModerationStatus.PENDING.value,
    )
    db.add(content)
    await db.commit()
    await db.refresh(content)

    return ContentItem(
        id=content.id,
        content_type=content.content_type,
        original_text=content.original_text,
        caption=content.caption,
        summary=content.summary,
        hashtags=content.hashtags,
        translated_text=content.translated_text,
        source_language=content.source_language,
        target_language=content.target_language,
        moderation_status=content.moderation_status,
        safety_score=content.safety_score,
        moderation_explanation=content.moderation_explanation,
        workflow_status="draft",
        is_scheduled=False,
        created_at=content.created_at.isoformat() if content.created_at else "",
        updated_at=content.updated_at.isoformat() if content.updated_at else "",
    )
