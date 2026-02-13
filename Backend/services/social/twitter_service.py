"""
Twitter/X Service for ContentOS using Twikit

Uses twikit library - No API key required!
Login with username/email/password to access Twitter's internal API.

FREE and unlimited (within reasonable use).
"""
import logging
import secrets
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path

from config import settings
from .base import BaseSocialProvider, SocialPublishResult

logger = logging.getLogger(__name__)


class TwitterService(BaseSocialProvider):
    """
    Twitter/X integration using twikit library.
    No API key required - uses Twitter's internal API.
    Supports multi-user via separate cookie files.
    """
    
    platform_name = "twitter"
    
    def __init__(self):
        self.cookies_dir = Path('./cookies')
        self.cookies_dir.mkdir(exist_ok=True)
        
        # User-specific clients and credentials
        # {user_id: {'client': Client, 'logged_in': bool}}
        self._sessions: Dict[int, Dict[str, Any]] = {}
        
        logger.info("Twitter service initialized (twikit multi-user)")
    
    def is_configured(self) -> bool:
        """Always configured since users provide credentials at runtime."""
        return True
    
    async def is_authenticated(self, user_id: int) -> bool:
        """Check if specific user is logged into Twitter."""
        return await self._ensure_client(user_id)
    
    async def connect_with_cookies(self, user_id: int, cookies: List[Dict[str, Any]]) -> bool:
        """Connect using manually provided cookies (bypasses login)."""
        import json
        from twikit import Client
        
        try:
            # Validate cookies structure (basic check)
            if not isinstance(cookies, list):
                # Try to convert if it's a dict (some extensions export dict)
                if isinstance(cookies, dict):
                    cookies = [{"name": k, "value": v} for k, v in cookies.items()]
                else:
                    raise ValueError("Cookies must be a JSON list or dictionary")

            # Save to file
            cookies_path = self.cookies_dir / f"twitter_{user_id}.json"
            with open(cookies_path, 'w') as f:
                json.dump(cookies, f)
            
            # Verify by loading
            client = Client('en-US')
            client._user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
            
            client.load_cookies(str(cookies_path))
            
            # Test connection (optional, get user info)
            # await client.user() 
            
            self._sessions[user_id] = {
                'client': client,
                'logged_in': True,
                'username': 'Cookie User' # We might update this later
            }
            logger.info(f"Twitter: User {user_id} connected via manual cookies")
            return True
            
        except Exception as e:
            logger.error(f"Twitter cookie import failed: {e}")
            # Clean up bad file
            if 'cookies_path' in locals() and cookies_path.exists():
                cookies_path.unlink()
            raise e

    async def connect(self, user_id: int, username: str, email: str, password: str) -> bool:
        """Connect a user using credentials."""
        from twikit import Client
        
        try:
            client = Client('en-US')
            # Use a modern, realistic User-Agent to avoid Cloudflare blocks (Chrome 132)
            client._user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
            
            # Login
            try:
                await client.login(
                    auth_info_1=username,
                    auth_info_2=email,
                    password=password
                )
            except Exception as login_err:
                logger.error(f"Twitter login error: {login_err}")
                if "403" in str(login_err) or "Cloudflare" in str(login_err):
                    raise ValueError(
                        "Twitter blocked the login (Cloudflare 403). "
                        "Please use the 'Manual Cookie Import' option."
                    )
                raise login_err
            
            # Save cookies
            cookies_path = self.cookies_dir / f"twitter_{user_id}.json"
            client.save_cookies(str(cookies_path))
            
            # Update session
            self._sessions[user_id] = {
                'client': client,
                'logged_in': True,
                'username': username
            }
            logger.info(f"Twitter: User {user_id} ({username}) logged in successfully")
            return True
            
        except Exception as e:
            logger.error(f"Twitter login failed for user {user_id}: {e}")
            raise e

    async def _ensure_client(self, user_id: int) -> bool:
        """Initialize and login to Twitter client for specific user."""
        if user_id in self._sessions and self._sessions[user_id].get('logged_in'):
            return True
            
        try:
            from twikit import Client
            cookies_path = self.cookies_dir / f"twitter_{user_id}.json"
            
            if not cookies_path.exists():
                return False
                
            client = Client('en-US')
            client._user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            try:
                client.load_cookies(str(cookies_path))
                
                self._sessions[user_id] = {
                    'client': client,
                    'logged_in': True
                }
                logger.info(f"Twitter: Loaded session for user {user_id}")
                return True
            except Exception as e:
                logger.warning(f"Failed to load Twitter cookies for user {user_id}: {e}")
                return False
                
        except Exception as e:
            logger.error(f"Twitter client init failed: {e}")
            return False

    async def get_auth_url(self, user_id: int, redirect_uri: str) -> str:
        """Not used for Twikit - uses direct login."""
        raise ValueError("Twikit uses direct login, not OAuth. Use credentials.")

    async def handle_callback(
        self, 
        user_id: int, 
        code: str, 
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """Not used for Twikit."""
        return {"success": False, "error": "Twikit uses direct login, not OAuth"}
            
    async def publish(
        self,
        user_id: int,
        content: str,
        media_urls: Optional[List[str]] = None,
        media_paths: Optional[List[str]] = None,
        **kwargs
    ) -> SocialPublishResult:
        """Publish a tweet for a specific user."""
        
        # Ensure logged in
        if not await self._ensure_client(user_id):
            return SocialPublishResult(
                success=False,
                platform=self.platform_name,
                error="Twitter not connected for this user",
            )
            
        client = self._sessions[user_id]['client']
        
        try:
            media_ids = []
            
            # Upload media if provided
            if media_paths:
                for path in media_paths:
                    if Path(path).exists():
                        media_id = await client.upload_media(path)
                        media_ids.append(media_id)
            
            # Create the tweet
            if media_ids:
                tweet = await client.create_tweet(
                    text=content[:280],
                    media_ids=media_ids
                )
            else:
                tweet = await client.create_tweet(
                    text=content[:280]
                )
            
            tweet_id = tweet.id if hasattr(tweet, 'id') else str(tweet)
            
            return SocialPublishResult(
                success=True,
                platform=self.platform_name,
                post_id=tweet_id,
                post_url=f"https://twitter.com/i/status/{tweet_id}",
                published_at=datetime.now(timezone.utc),
            )
            
        except Exception as e:
            logger.error(f"Tweet failed: {e}")
            return SocialPublishResult(
                success=False,
                platform=self.platform_name,
                error=str(e),
            )
    
    async def disconnect(self, user_id: int) -> bool:
        """Disconnect specific user."""
        try:
            cookies_path = self.cookies_dir / f"twitter_{user_id}.json"
            if cookies_path.exists():
                cookies_path.unlink()
            
            if user_id in self._sessions:
                del self._sessions[user_id]
                
            return True
        except Exception as e:
            logger.error(f"Failed to disconnect Twitter user {user_id}: {e}")
            return False


# Singleton instance
_twitter_service: Optional[TwitterService] = None


def get_twitter_service() -> TwitterService:
    """Get or create the Twitter service singleton."""
    global _twitter_service
    if _twitter_service is None:
        _twitter_service = TwitterService()
    return _twitter_service

