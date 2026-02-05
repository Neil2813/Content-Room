"""
Social Account Model for ContentOS

Stores OAuth tokens and platform connections for users.
"""
from datetime import datetime
from typing import Optional
from enum import Enum

from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Boolean, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class SocialPlatform(str, Enum):
    """Supported social media platforms."""
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    YOUTUBE = "youtube"
    FACEBOOK = "facebook"


class SocialAccount(Base):
    """
    Stores user's connected social media accounts.
    
    Attributes:
        id: Primary key
        user_id: Owner of the connection
        platform: Social media platform
        
        platform_user_id: User's ID on the platform
        platform_username: Username on the platform
        
        access_token: OAuth access token (encrypted in production)
        refresh_token: OAuth refresh token
        token_expires_at: When the access token expires
        
        is_active: Whether the connection is active
        last_used_at: Last time this account was used to post
        metadata: Additional platform-specific data
    """
    __tablename__ = "social_accounts"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Platform-specific identifiers
    platform_user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    platform_username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # OAuth tokens (should be encrypted in production)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    
    # Platform-specific metadata (JSON)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    
    # Relationship to user
    # user = relationship("User", back_populates="social_accounts")
    
    def __repr__(self) -> str:
        return f"<SocialAccount(id={self.id}, platform={self.platform}, user_id={self.user_id})>"
    
    def is_token_expired(self) -> bool:
        """Check if the access token is expired."""
        if not self.token_expires_at:
            return False
        return datetime.now(self.token_expires_at.tzinfo) >= self.token_expires_at
