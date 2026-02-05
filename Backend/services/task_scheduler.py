"""
Task Scheduler Service for ContentOS

Uses APScheduler to run background tasks for:
1. Publishing scheduled posts
2. Refreshing OAuth tokens
3. Cleanup of expired media

Lightweight and works without Redis (perfect for MVP).
"""
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Callable, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import async_session_maker
from models.schedule import ScheduledPost, ScheduleStatus

logger = logging.getLogger(__name__)


class TaskSchedulerService:
    """
    Background task scheduler using APScheduler.
    Runs scheduled posts at their designated times.
    """
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        self._social_services = {}
    
    def start(self):
        """Start the scheduler."""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        # Add job to check for pending posts every minute
        self.scheduler.add_job(
            self._check_pending_posts,
            IntervalTrigger(seconds=60),
            id="check_pending_posts",
            name="Check and publish pending posts",
            replace_existing=True,
        )
        
        # Add job to refresh OAuth tokens daily at 3 AM
        self.scheduler.add_job(
            self._refresh_oauth_tokens,
            CronTrigger(hour=3, minute=0),
            id="refresh_oauth_tokens",
            name="Refresh expiring OAuth tokens",
            replace_existing=True,
        )
        
        # Add job to cleanup old uploads weekly
        self.scheduler.add_job(
            self._cleanup_old_uploads,
            CronTrigger(day_of_week='sun', hour=4, minute=0),
            id="cleanup_old_uploads",
            name="Cleanup old temporary uploads",
            replace_existing=True,
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("Task scheduler started")
    
    def stop(self):
        """Stop the scheduler."""
        if not self.is_running:
            return
        
        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info("Task scheduler stopped")
    
    def register_social_service(self, platform: str, service: Any):
        """Register a social media service for publishing."""
        self._social_services[platform.lower()] = service
        logger.info(f"Registered social service: {platform}")
    
    async def _check_pending_posts(self):
        """Check for posts that need to be published."""
        logger.debug("Checking for pending posts...")
        
        async with async_session_maker() as db:
            try:
                # Find posts that are due
                now = datetime.now(timezone.utc)
                query = select(ScheduledPost).where(
                    and_(
                        ScheduledPost.status == ScheduleStatus.QUEUED.value,
                        ScheduledPost.scheduled_at <= now
                    )
                ).order_by(ScheduledPost.scheduled_at)
                
                result = await db.execute(query)
                pending_posts = result.scalars().all()
                
                if not pending_posts:
                    logger.debug("No pending posts to publish")
                    return
                
                logger.info(f"Found {len(pending_posts)} posts to publish")
                
                for post in pending_posts:
                    await self._publish_post(db, post)
                
                await db.commit()
                
            except Exception as e:
                logger.error(f"Error checking pending posts: {e}")
                await db.rollback()
    
    async def _publish_post(self, db: AsyncSession, post: ScheduledPost):
        """Publish a scheduled post to its target platform."""
        logger.info(f"Publishing post {post.id} to {post.platform or 'default'}")
        
        try:
            platform = (post.platform or "demo").lower()
            
            # Check if we have a service for this platform
            if platform in self._social_services:
                service = self._social_services[platform]
                result = await service.publish(
                    user_id=post.user_id,
                    content=post.description or post.title,
                    title=post.title,
                )
                
                if result.get("success"):
                    post.status = ScheduleStatus.PUBLISHED.value
                    post.published_at = datetime.now(timezone.utc)
                    logger.info(f"Post {post.id} published successfully to {platform}")
                else:
                    post.status = ScheduleStatus.FAILED.value
                    logger.error(f"Post {post.id} failed: {result.get('error')}")
            else:
                # Demo mode - simulate publishing
                logger.info(f"Demo mode: Simulating publish for post {post.id}")
                post.status = ScheduleStatus.PUBLISHED.value
                post.published_at = datetime.now(timezone.utc)
                
        except Exception as e:
            logger.error(f"Failed to publish post {post.id}: {e}")
            post.status = ScheduleStatus.FAILED.value
    
    async def _refresh_oauth_tokens(self):
        """Refresh OAuth tokens that are about to expire."""
        logger.info("Checking for expiring OAuth tokens...")
        # TODO: Implement token refresh logic
        pass
    
    async def _cleanup_old_uploads(self):
        """Clean up old temporary uploads."""
        logger.info("Cleaning up old temporary uploads...")
        # TODO: Implement cleanup logic
        pass
    
    def get_status(self) -> dict:
        """Get scheduler status."""
        jobs = []
        if self.is_running:
            for job in self.scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": str(job.next_run_time) if job.next_run_time else None,
                })
        
        return {
            "running": self.is_running,
            "jobs": jobs,
            "registered_platforms": list(self._social_services.keys()),
        }
    
    async def trigger_post_now(self, post_id: int) -> dict:
        """Manually trigger a post to be published immediately."""
        async with async_session_maker() as db:
            try:
                result = await db.execute(
                    select(ScheduledPost).where(ScheduledPost.id == post_id)
                )
                post = result.scalar_one_or_none()
                
                if not post:
                    return {"success": False, "error": "Post not found"}
                
                if post.status == ScheduleStatus.PUBLISHED.value:
                    return {"success": False, "error": "Post already published"}
                
                await self._publish_post(db, post)
                await db.commit()
                
                return {
                    "success": post.status == ScheduleStatus.PUBLISHED.value,
                    "status": post.status,
                    "published_at": str(post.published_at) if post.published_at else None,
                }
                
            except Exception as e:
                logger.error(f"Error triggering post: {e}")
                return {"success": False, "error": str(e)}


# ============================================
# Singleton Instance
# ============================================

_scheduler_service: Optional[TaskSchedulerService] = None


def get_scheduler_service() -> TaskSchedulerService:
    """Get or create the scheduler service singleton."""
    global _scheduler_service
    if _scheduler_service is None:
        _scheduler_service = TaskSchedulerService()
    return _scheduler_service


def start_scheduler():
    """Start the background scheduler."""
    service = get_scheduler_service()
    service.start()
    return service


def stop_scheduler():
    """Stop the background scheduler."""
    global _scheduler_service
    if _scheduler_service:
        _scheduler_service.stop()
