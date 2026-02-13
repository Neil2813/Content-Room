"""
History Router for Content Room

Provides unified history view combining content items and scheduled posts.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, union_all, func, desc

from database import get_db
from models.content import Content, ModerationStatus
from models.schedule import ScheduledPost, ScheduleStatus
from models.user import User
from routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class HistoryItem(BaseModel):
    """Unified history item."""
    id: int
    item_type: str  # 'content' or 'scheduled'
    title: str
    description: Optional[str] = None
    status: str
    platform: Optional[str] = None
    safety_score: Optional[float] = None
    created_at: str
    updated_at: Optional[str] = None


class HistoryResponse(BaseModel):
    """History list response with pagination."""
    items: List[HistoryItem]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class HistoryStats(BaseModel):
    """Statistics for history items."""
    total_content: int
    total_scheduled: int
    published_count: int
    moderated_count: int
    this_week_content: int
    this_week_scheduled: int


@router.get("/", response_model=HistoryResponse)
async def get_user_history(
    item_type: Optional[str] = Query(None, description="Filter by type: 'content' or 'scheduled'"),
    time_range: Optional[str] = Query(None, description="Filter by time: 'today', 'week', 'month'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's activity history combining content and scheduled posts.
    
    Parameters:
    - item_type: Filter by 'content' or 'scheduled'
    - time_range: Filter by 'today', 'week', or 'month'
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    
    Returns paginated list of history items sorted by creation date (newest first).
    """
    items: List[HistoryItem] = []
    
    # Calculate time filter
    time_filter = None
    if time_range:
        now = datetime.utcnow()
        if time_range == 'today':
            time_filter = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == 'week':
            time_filter = now - timedelta(days=7)
        elif time_range == 'month':
            time_filter = now - timedelta(days=30)
    
    # Fetch content items
    if not item_type or item_type == 'content':
        content_query = select(Content).where(Content.user_id == current_user.id)
        if time_filter:
            content_query = content_query.where(Content.created_at >= time_filter)
        content_query = content_query.order_by(desc(Content.created_at))
        
        content_result = await db.execute(content_query)
        contents = content_result.scalars().all()
        
        for c in contents:
            # Determine workflow status
            status = 'draft'
            if c.moderation_status and c.moderation_status != ModerationStatus.PENDING.value:
                status = 'moderated'
            if c.translated_text:
                status = 'translated'
            
            title = c.caption or c.summary or (c.original_text[:50] + '...' if c.original_text and len(c.original_text) > 50 else c.original_text) or f"Content #{c.id}"
            
            items.append(HistoryItem(
                id=c.id,
                item_type='content',
                title=title or f"Content #{c.id}",
                description=c.original_text[:100] if c.original_text else None,
                status=status,
                platform=None,
                safety_score=c.safety_score,
                created_at=c.created_at.isoformat() if c.created_at else "",
                updated_at=c.updated_at.isoformat() if c.updated_at else None,
            ))
    
    # Fetch scheduled posts
    if not item_type or item_type == 'scheduled':
        scheduled_query = select(ScheduledPost).where(ScheduledPost.user_id == current_user.id)
        if time_filter:
            scheduled_query = scheduled_query.where(ScheduledPost.created_at >= time_filter)
        scheduled_query = scheduled_query.order_by(desc(ScheduledPost.created_at))
        
        scheduled_result = await db.execute(scheduled_query)
        posts = scheduled_result.scalars().all()
        
        for p in posts:
            items.append(HistoryItem(
                id=p.id,
                item_type='scheduled',
                title=p.title,
                description=p.description[:100] if p.description else None,
                status=p.status,
                platform=p.platform,
                safety_score=None,
                created_at=p.created_at.isoformat() if p.created_at else "",
                updated_at=p.updated_at.isoformat() if p.updated_at else None,
            ))
    
    # Sort all items by created_at descending
    items.sort(key=lambda x: x.created_at, reverse=True)
    
    # Calculate pagination
    total_count = len(items)
    total_pages = (total_count + page_size - 1) // page_size
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_items = items[start_idx:end_idx]
    
    return HistoryResponse(
        items=paginated_items,
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=HistoryStats)
async def get_history_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get statistics for user's history.
    
    Returns counts for content, scheduled posts, and weekly activity.
    """
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    # Total content
    total_content_result = await db.execute(
        select(func.count(Content.id)).where(Content.user_id == current_user.id)
    )
    total_content = total_content_result.scalar() or 0
    
    # Total scheduled
    total_scheduled_result = await db.execute(
        select(func.count(ScheduledPost.id)).where(ScheduledPost.user_id == current_user.id)
    )
    total_scheduled = total_scheduled_result.scalar() or 0
    
    # Published count
    published_result = await db.execute(
        select(func.count(ScheduledPost.id)).where(
            ScheduledPost.user_id == current_user.id,
            ScheduledPost.status == ScheduleStatus.PUBLISHED.value,
        )
    )
    published_count = published_result.scalar() or 0
    
    # Moderated count
    moderated_result = await db.execute(
        select(func.count(Content.id)).where(
            Content.user_id == current_user.id,
            Content.moderation_status != ModerationStatus.PENDING.value,
        )
    )
    moderated_count = moderated_result.scalar() or 0
    
    # This week content
    week_content_result = await db.execute(
        select(func.count(Content.id)).where(
            Content.user_id == current_user.id,
            Content.created_at >= week_ago,
        )
    )
    this_week_content = week_content_result.scalar() or 0
    
    # This week scheduled
    week_scheduled_result = await db.execute(
        select(func.count(ScheduledPost.id)).where(
            ScheduledPost.user_id == current_user.id,
            ScheduledPost.created_at >= week_ago,
        )
    )
    this_week_scheduled = week_scheduled_result.scalar() or 0
    
    return HistoryStats(
        total_content=total_content,
        total_scheduled=total_scheduled,
        published_count=published_count,
        moderated_count=moderated_count,
        this_week_content=this_week_content,
        this_week_scheduled=this_week_scheduled,
    )
