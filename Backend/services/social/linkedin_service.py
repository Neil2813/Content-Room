"""
LinkedIn Service for ContentOS

Uses official LinkedIn API Python client.
Requires OAuth 2.0 for authentication.

Requirements:
- LinkedIn Developer App
- OAuth access token with required scopes
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


class LinkedInService(BaseSocialProvider):
    """
    LinkedIn API integration using official Python client.
    
    Required scopes:
    - openid (for user profile)
    - profile (for user info)
    - w_member_social (for posting)
    """
    
    platform_name = "linkedin"
    
    # OAuth endpoints
    AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
    TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
    API_BASE = "https://api.linkedin.com/v2"
    
    # Required scopes for posting
    SCOPES = ["openid", "profile", "w_member_social"]
    
    def __init__(self):
        self.client_id = getattr(settings, 'linkedin_client_id', None)
        self.client_secret = getattr(settings, 'linkedin_client_secret', None)
        self.redirect_uri = getattr(settings, 'linkedin_redirect_uri',
                                    'http://localhost:8000/api/v1/social/linkedin/callback')
        
        # Token storage (replace with database in production)
        self._tokens: Dict[int, Dict[str, Any]] = {}
        self._states: Dict[str, int] = {}
        
        if self.client_id:
            logger.info("LinkedIn service initialized")
    
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)
    
    async def is_authenticated(self, user_id: int) -> bool:
        return user_id in self._tokens and self._tokens[user_id].get('access_token')
    
    async def get_auth_url(self, user_id: int, redirect_uri: Optional[str] = None) -> str:
        """Get LinkedIn OAuth URL."""
        if not self.is_configured():
            raise ValueError("LinkedIn not configured")
        
        state = secrets.token_urlsafe(16)
        self._states[state] = user_id
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri or self.redirect_uri,
            "scope": " ".join(self.SCOPES),
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
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": self.redirect_uri,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                
                if response.status_code != 200:
                    logger.error(f"LinkedIn token exchange failed: {response.text}")
                    return {"success": False, "error": response.text}
                
                tokens = response.json()
                
                # Get user profile to get the person URN
                profile_response = await client.get(
                    f"{self.API_BASE}/userinfo",
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                )
                
                person_urn = None
                if profile_response.status_code == 200:
                    profile = profile_response.json()
                    person_urn = f"urn:li:person:{profile.get('sub')}"
                
                # Store tokens
                self._tokens[user_id] = {
                    "access_token": tokens["access_token"],
                    "expires_in": tokens.get("expires_in"),
                    "person_urn": person_urn,
                }
                
                logger.info(f"LinkedIn connected for user {user_id}")
                return {"success": True, "message": "LinkedIn connected successfully"}
                
        except Exception as e:
            logger.error(f"LinkedIn callback error: {e}")
            return {"success": False, "error": str(e)}
    
    async def publish(
        self,
        user_id: int,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> SocialPublishResult:
        """
        Publish to LinkedIn.
        
        Creates a share/post on the user's LinkedIn profile.
        """
        # Demo mode if not configured
        if not self.is_configured():
            return SocialPublishResult(
                success=True,
                platform=self.platform_name,
                post_id=f"demo_{secrets.token_hex(8)}",
                post_url="https://linkedin.com/feed/update/demo",
                metadata={"mode": "demo", "reason": "LinkedIn not configured"},
                published_at=datetime.now(timezone.utc),
            )
        
        if not await self.is_authenticated(user_id):
            return SocialPublishResult(
                success=False,
                platform=self.platform_name,
                error="User not authenticated with LinkedIn",
            )
        
        try:
            token_data = self._tokens[user_id]
            access_token = token_data["access_token"]
            person_urn = token_data.get("person_urn")
            
            if not person_urn:
                return SocialPublishResult(
                    success=False,
                    platform=self.platform_name,
                    error="LinkedIn user URN not found",
                )
            
            async with httpx.AsyncClient() as client:
                # Create a text post
                post_data = {
                    "author": person_urn,
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {
                                "text": content[:3000]  # LinkedIn limit
                            },
                            "shareMediaCategory": "NONE"
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                    }
                }
                
                response = await client.post(
                    f"{self.API_BASE}/ugcPosts",
                    json=post_data,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                )
                
                if response.status_code not in [200, 201]:
                    logger.error(f"LinkedIn post failed: {response.text}")
                    return SocialPublishResult(
                        success=False,
                        platform=self.platform_name,
                        error=response.text,
                    )
                
                data = response.json()
                post_id = data.get("id", "unknown")
                
                return SocialPublishResult(
                    success=True,
                    platform=self.platform_name,
                    post_id=post_id,
                    post_url=f"https://linkedin.com/feed/update/{post_id}",
                    published_at=datetime.now(timezone.utc),
                )
                
        except Exception as e:
            logger.error(f"LinkedIn publish error: {e}")
            return SocialPublishResult(
                success=False,
                platform=self.platform_name,
                error=str(e),
            )
    
    async def disconnect(self, user_id: int) -> bool:
        """Disconnect user's LinkedIn account."""
        if user_id in self._tokens:
            del self._tokens[user_id]
            logger.info(f"LinkedIn disconnected for user {user_id}")
            return True
        return False


# Singleton instance
_linkedin_service: Optional[LinkedInService] = None


def get_linkedin_service() -> LinkedInService:
    """Get or create the LinkedIn service singleton."""
    global _linkedin_service
    if _linkedin_service is None:
        _linkedin_service = LinkedInService()
    return _linkedin_service
