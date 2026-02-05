"""
Instagram Service for ContentOS

Integrates with Instagram Graph API for posting.
Requires Instagram Business/Creator account linked to Facebook Page.

Note: Instagram API is complex - requires Facebook Business account.
This implementation includes demo mode for easy testing.
"""
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

import httpx

from config import settings
from .base import BaseSocialProvider, SocialPublishResult

logger = logging.getLogger(__name__)


class InstagramService(BaseSocialProvider):
    """
    Instagram Graph API integration.
    
    Requirements:
    - Instagram Business or Creator account
    - Linked to a Facebook Page
    - Facebook App with instagram_basic + instagram_content_publish permissions
    """
    
    platform_name = "instagram"
    
    # API endpoints
    AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
    TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
    API_BASE = "https://graph.facebook.com/v18.0"
    
    # OAuth scopes
    SCOPES = [
        "instagram_basic",
        "instagram_content_publish",
        "pages_read_engagement",
        "pages_show_list",
    ]
    
    def __init__(self):
        self.app_id = getattr(settings, 'facebook_app_id', None)
        self.app_secret = getattr(settings, 'facebook_app_secret', None)
        self.redirect_uri = getattr(settings, 'instagram_redirect_uri',
                                    'http://localhost:8000/api/v1/social/instagram/callback')
        
        # In-memory token storage (replace with database in production)
        self._tokens: Dict[int, Dict[str, Any]] = {}
        self._states: Dict[str, int] = {}  # state -> user_id
        
        if self.app_id:
            logger.info("Instagram service initialized")
    
    def is_configured(self) -> bool:
        return bool(self.app_id and self.app_secret)
    
    async def is_authenticated(self, user_id: int) -> bool:
        return user_id in self._tokens and self._tokens[user_id].get('access_token')
    
    async def get_auth_url(self, user_id: int, redirect_uri: Optional[str] = None) -> str:
        """Get Facebook OAuth URL for Instagram access."""
        if not self.is_configured():
            raise ValueError("Instagram/Facebook not configured")
        
        state = secrets.token_urlsafe(16)
        self._states[state] = user_id
        
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri or self.redirect_uri,
            "scope": ",".join(self.SCOPES),
            "response_type": "code",
            "state": state,
        }
        
        return f"{self.AUTH_URL}?{urlencode(params)}"
    
    async def handle_callback(
        self, 
        user_id: int, 
        code: str, 
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        try:
            async with httpx.AsyncClient() as client:
                # Exchange code for short-lived token
                response = await client.get(
                    self.TOKEN_URL,
                    params={
                        "client_id": self.app_id,
                        "client_secret": self.app_secret,
                        "redirect_uri": self.redirect_uri,
                        "code": code,
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.text}")
                    return {"success": False, "error": response.text}
                
                data = response.json()
                short_token = data["access_token"]
                
                # Exchange for long-lived token
                long_response = await client.get(
                    f"{self.API_BASE}/oauth/access_token",
                    params={
                        "grant_type": "fb_exchange_token",
                        "client_id": self.app_id,
                        "client_secret": self.app_secret,
                        "fb_exchange_token": short_token,
                    }
                )
                
                if long_response.status_code == 200:
                    long_data = long_response.json()
                    access_token = long_data["access_token"]
                else:
                    access_token = short_token
                
                # Get Instagram Business Account ID
                ig_account_id = await self._get_instagram_account_id(client, access_token)
                
                if not ig_account_id:
                    return {"success": False, "error": "No Instagram Business account found"}
                
                # Store tokens
                self._tokens[user_id] = {
                    "access_token": access_token,
                    "instagram_account_id": ig_account_id,
                }
                
                logger.info(f"Instagram connected for user {user_id}")
                return {"success": True, "message": "Instagram connected successfully"}
                
        except Exception as e:
            logger.error(f"Instagram callback error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _get_instagram_account_id(
        self, 
        client: httpx.AsyncClient, 
        access_token: str
    ) -> Optional[str]:
        """Get the Instagram Business Account ID linked to user's Facebook pages."""
        try:
            # Get user's pages
            pages_response = await client.get(
                f"{self.API_BASE}/me/accounts",
                params={"access_token": access_token}
            )
            
            if pages_response.status_code != 200:
                return None
            
            pages = pages_response.json().get("data", [])
            
            # Check each page for linked Instagram account
            for page in pages:
                page_id = page["id"]
                page_token = page["access_token"]
                
                ig_response = await client.get(
                    f"{self.API_BASE}/{page_id}",
                    params={
                        "fields": "instagram_business_account",
                        "access_token": page_token,
                    }
                )
                
                if ig_response.status_code == 200:
                    ig_data = ig_response.json()
                    if "instagram_business_account" in ig_data:
                        return ig_data["instagram_business_account"]["id"]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting Instagram account ID: {e}")
            return None
    
    async def publish(
        self,
        user_id: int,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> SocialPublishResult:
        """
        Publish to Instagram.
        
        Note: Instagram requires media for posts. Text-only posts are not supported.
        If no media is provided, uses demo mode.
        """
        # Demo mode if not configured or authenticated
        if not self.is_configured():
            return SocialPublishResult(
                success=True,
                platform=self.platform_name,
                post_id=f"demo_{secrets.token_hex(8)}",
                post_url="https://instagram.com/p/demo",
                metadata={"mode": "demo", "reason": "Instagram not configured"},
                published_at=datetime.now(timezone.utc),
            )
        
        if not await self.is_authenticated(user_id):
            return SocialPublishResult(
                success=False,
                platform=self.platform_name,
                error="User not authenticated with Instagram",
            )
        
        if not media_urls:
            return SocialPublishResult(
                success=True,
                platform=self.platform_name,
                post_id=f"demo_{secrets.token_hex(8)}",
                post_url="https://instagram.com/p/demo",
                metadata={"mode": "demo", "reason": "No media provided (Instagram requires media)"},
                published_at=datetime.now(timezone.utc),
            )
        
        try:
            token_data = self._tokens[user_id]
            access_token = token_data["access_token"]
            ig_account_id = token_data["instagram_account_id"]
            
            async with httpx.AsyncClient() as client:
                # Step 1: Create media container
                media_url = media_urls[0]  # Use first media
                
                container_response = await client.post(
                    f"{self.API_BASE}/{ig_account_id}/media",
                    data={
                        "image_url": media_url,
                        "caption": content[:2200],  # Instagram caption limit
                        "access_token": access_token,
                    }
                )
                
                if container_response.status_code != 200:
                    logger.error(f"Media container creation failed: {container_response.text}")
                    return SocialPublishResult(
                        success=False,
                        platform=self.platform_name,
                        error=container_response.text,
                    )
                
                container_id = container_response.json()["id"]
                
                # Step 2: Publish the container
                publish_response = await client.post(
                    f"{self.API_BASE}/{ig_account_id}/media_publish",
                    data={
                        "creation_id": container_id,
                        "access_token": access_token,
                    }
                )
                
                if publish_response.status_code != 200:
                    logger.error(f"Media publish failed: {publish_response.text}")
                    return SocialPublishResult(
                        success=False,
                        platform=self.platform_name,
                        error=publish_response.text,
                    )
                
                post_id = publish_response.json()["id"]
                
                return SocialPublishResult(
                    success=True,
                    platform=self.platform_name,
                    post_id=post_id,
                    post_url=f"https://instagram.com/p/{post_id}",
                    published_at=datetime.now(timezone.utc),
                )
                
        except Exception as e:
            logger.error(f"Instagram publish error: {e}")
            return SocialPublishResult(
                success=False,
                platform=self.platform_name,
                error=str(e),
            )
    
    async def disconnect(self, user_id: int) -> bool:
        """Disconnect user's Instagram account."""
        if user_id in self._tokens:
            del self._tokens[user_id]
            logger.info(f"Instagram disconnected for user {user_id}")
            return True
        return False


# Singleton instance
_instagram_service: Optional[InstagramService] = None


def get_instagram_service() -> InstagramService:
    """Get or create the Instagram service singleton."""
    global _instagram_service
    if _instagram_service is None:
        _instagram_service = InstagramService()
    return _instagram_service
