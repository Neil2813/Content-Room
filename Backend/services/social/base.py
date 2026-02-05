"""
Base Social Media Provider for ContentOS

Abstract base class for all social media integrations.
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SocialPublishResult:
    """Result of publishing to a social platform."""
    success: bool
    platform: str
    post_id: Optional[str] = None
    post_url: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    published_at: Optional[datetime] = None


class BaseSocialProvider(ABC):
    """
    Abstract base class for social media providers.
    All platform-specific services should inherit from this.
    """
    
    platform_name: str = "unknown"
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider is configured with API credentials."""
        pass
    
    @abstractmethod
    async def is_authenticated(self, user_id: int) -> bool:
        """Check if a user has connected their account."""
        pass
    
    @abstractmethod
    async def get_auth_url(self, user_id: int, redirect_uri: str) -> str:
        """Get the OAuth authorization URL for connecting account."""
        pass
    
    @abstractmethod
    async def handle_callback(
        self, 
        user_id: int, 
        code: str, 
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Handle OAuth callback and store tokens."""
        pass
    
    @abstractmethod
    async def publish(
        self,
        user_id: int,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> SocialPublishResult:
        """
        Publish content to the platform.
        
        Args:
            user_id: User ID from our database
            content: Text content to post
            media_urls: List of media URLs to attach
            **kwargs: Platform-specific options
            
        Returns:
            SocialPublishResult with success status and metadata
        """
        pass
    
    @abstractmethod
    async def disconnect(self, user_id: int) -> bool:
        """Disconnect/revoke user's account connection."""
        pass
    
    async def refresh_token(self, user_id: int) -> bool:
        """Refresh OAuth token if expired. Override in subclass."""
        return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get provider status."""
        return {
            "platform": self.platform_name,
            "configured": self.is_configured(),
        }
