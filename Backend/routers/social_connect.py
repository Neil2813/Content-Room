"""
Social Connect Router for ContentOS

Handles OAuth connections and publishing for social media platforms:
- Twitter/X (using twikit - no API key required!)
- Instagram (using Graph API)
- LinkedIn (using official API)
"""
import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query, Form
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from services.social.twitter_service import get_twitter_service
from services.social.instagram_service import get_instagram_service
from services.social.linkedin_service import get_linkedin_service
from services.task_scheduler import get_scheduler_service

logger = logging.getLogger(__name__)
router = APIRouter()

# ... (Previous code remains)

@router.get("/instagram/callback", response_class=HTMLResponse)
async def instagram_callback(
    code: str = Query(...),
    state: str = Query(None),
    user_id: int = 1,
):
    """Handle Instagram/Facebook OAuth callback."""
    service = get_instagram_service()
    
    result = await service.handle_callback(user_id, code, state)
    
    if result.get("success"):
        scheduler = get_scheduler_service()
        scheduler.register_social_service("instagram", service)
        return """
        <html>
            <script>
                if (window.opener) {
                    window.opener.postMessage({ type: 'INSTAGRAM_CONNECTED', success: true }, '*');
                    window.close();
                } else {
                    document.write("Instagram connected! You can close this window.");
                }
            </script>
        </html>
        """
    else:
        return f"""
        <html>
            <body>
                <h1>Connection Failed</h1>
                <p>{result.get("error", "Unknown error")}</p>
            </body>
        </html>
        """

# ... (Skip ahead to LinkedIn callback)

@router.get("/linkedin/callback", response_class=HTMLResponse)
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(None),
    user_id: int = 1,
):
    """Handle LinkedIn OAuth callback."""
    service = get_linkedin_service()
    
    result = await service.handle_callback(user_id, code, state)
    
    if result.get("success"):
        scheduler = get_scheduler_service()
        scheduler.register_social_service("linkedin", service)
        return """
        <html>
            <script>
                if (window.opener) {
                    window.opener.postMessage({ type: 'LINKEDIN_CONNECTED', success: true }, '*');
                    window.close();
                } else {
                    document.write("LinkedIn connected! You can close this window.");
                }
            </script>
        </html>
        """
    else:
        return f"""
        <html>
            <body>
                <h1>Connection Failed</h1>
                <p>{result.get("error", "Unknown error")}</p>
            </body>
        </html>
        """


# ============================================
# Response Models
# ============================================

class PlatformStatus(BaseModel):
    """Status of a social platform."""
    platform: str
    configured: bool
    connected: bool
    auth_type: str = "oauth"  # oauth or credentials


class ConnectUrlResponse(BaseModel):
    """Response with OAuth URL."""
    url: str
    platform: str


class CredentialsLoginRequest(BaseModel):
    """Request for credentials-based login (Twitter)."""
    username: str
    email: str
    password: str


class CookieConnectRequest(BaseModel):
    """Request for cookie-based login (Twitter bypass)."""
    user_id: int
    cookies: List[Dict[str, Any]] | Dict[str, Any]


class PublishRequest(BaseModel):
    """Request to publish content."""
    content: str
    media_urls: Optional[list] = None
    media_paths: Optional[list] = None
    user_id: int = 1  # Default user for demo


class PublishResponse(BaseModel):
    """Response from publishing."""
    success: bool
    platform: str
    post_id: Optional[str] = None
    post_url: Optional[str] = None
    error: Optional[str] = None
    mode: Optional[str] = None


# ============================================
# Twitter Endpoints (using twikit - no API key!)
# ============================================

@router.get("/twitter/status", response_model=PlatformStatus)
async def twitter_status(user_id: int = 1):
    """Get Twitter connection status."""
    service = get_twitter_service()
    return PlatformStatus(
        platform="twitter",
        configured=service.is_configured(),
        connected=await service.is_authenticated(user_id),
        auth_type="credentials",  # twikit uses username/password
    )


@router.post("/twitter/connect-cookies")
async def twitter_connect_cookies(request: CookieConnectRequest):
    """
    Connect Twitter using manual cookies import to bypass Cloudflare/2FA.
    Paste cookies exported from "EditThisCookie" or similar extension.
    """
    service = get_twitter_service()
    try:
        await service.connect_with_cookies(
            user_id=request.user_id,
            cookies=request.cookies
        )
        
        # Register with scheduler
        scheduler = get_scheduler_service()
        scheduler.register_social_service("twitter", service)
        
        return {"success": True, "message": "Twitter connected via cookies!"}
        
    except Exception as e:
        logger.error(f"Twitter cookie connect error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to connect: {str(e)}")


@router.post("/twitter/connect")
async def twitter_connect_credentials(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    user_id: int = Form(1)  # Default for demo
):
    """
    Connect Twitter account using credentials.
    
    Note: twikit uses Twitter's internal API - no API key required!
    Just provide your Twitter login credentials.
    """
    service = get_twitter_service()
    
    try:
        # Use new multi-user connect method
        await service.connect(
            user_id=user_id, 
            username=username, 
            email=email, 
            password=password
        )
        
        # Register with scheduler
        scheduler = get_scheduler_service()
        scheduler.register_social_service("twitter", service)
        
        return {"success": True, "message": "Twitter connected successfully!"}
        
    except Exception as e:
        logger.error(f"Twitter connect error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to connect: {str(e)}")


@router.post("/twitter/publish", response_model=PublishResponse)
async def twitter_publish(request: PublishRequest):
    """Publish a tweet."""
    service = get_twitter_service()
    
    result = await service.publish(
        user_id=request.user_id,
        content=request.content,
        media_urls=request.media_urls,
        media_paths=request.media_paths,
    )
    
    return PublishResponse(
        success=result.success,
        platform=result.platform,
        post_id=result.post_id,
        post_url=result.post_url,
        error=result.error,
        mode=result.metadata.get("mode"),
    )


@router.delete("/twitter/disconnect")
async def twitter_disconnect(user_id: int = 1):
    """Disconnect Twitter account."""
    service = get_twitter_service()
    success = await service.disconnect(user_id)
    return {"success": success}


# ============================================
# Instagram Endpoints
# ============================================

@router.get("/instagram/status", response_model=PlatformStatus)
async def instagram_status(user_id: int = 1):
    """Get Instagram connection status."""
    service = get_instagram_service()
    return PlatformStatus(
        platform="instagram",
        configured=service.is_configured(),
        connected=await service.is_authenticated(user_id),
        auth_type="oauth",
    )


@router.get("/instagram/connect", response_model=ConnectUrlResponse)
async def instagram_connect(user_id: int = 1, redirect_uri: Optional[str] = None):
    """Get Instagram/Facebook OAuth URL."""
    service = get_instagram_service()
    
    if not service.is_configured():
        raise HTTPException(
            status_code=400, 
            detail="Instagram not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env"
        )
    
    try:
        url = await service.get_auth_url(user_id, redirect_uri)
        return ConnectUrlResponse(url=url, platform="instagram")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@router.post("/instagram/publish", response_model=PublishResponse)
async def instagram_publish(request: PublishRequest):
    """Publish to Instagram."""
    service = get_instagram_service()
    
    result = await service.publish(
        user_id=request.user_id,
        content=request.content,
        media_urls=request.media_urls,
    )
    
    return PublishResponse(
        success=result.success,
        platform=result.platform,
        post_id=result.post_id,
        post_url=result.post_url,
        error=result.error,
        mode=result.metadata.get("mode"),
    )


@router.delete("/instagram/disconnect")
async def instagram_disconnect(user_id: int = 1):
    """Disconnect Instagram account."""
    service = get_instagram_service()
    success = await service.disconnect(user_id)
    return {"success": success}


# ============================================
# LinkedIn Endpoints
# ============================================

@router.get("/linkedin/status", response_model=PlatformStatus)
async def linkedin_status(user_id: int = 1):
    """Get LinkedIn connection status."""
    service = get_linkedin_service()
    return PlatformStatus(
        platform="linkedin",
        configured=service.is_configured(),
        connected=await service.is_authenticated(user_id),
        auth_type="oauth",
    )


@router.get("/linkedin/connect", response_model=ConnectUrlResponse)
async def linkedin_connect(user_id: int = 1, redirect_uri: Optional[str] = None):
    """Get LinkedIn OAuth URL."""
    service = get_linkedin_service()
    
    if not service.is_configured():
        raise HTTPException(
            status_code=400, 
            detail="LinkedIn not configured. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env"
        )
    
    try:
        url = await service.get_auth_url(user_id, redirect_uri)
        return ConnectUrlResponse(url=url, platform="linkedin")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@router.post("/linkedin/publish", response_model=PublishResponse)
async def linkedin_publish(request: PublishRequest):
    """Publish to LinkedIn."""
    service = get_linkedin_service()
    
    result = await service.publish(
        user_id=request.user_id,
        content=request.content,
        media_urls=request.media_urls,
    )
    
    return PublishResponse(
        success=result.success,
        platform=result.platform,
        post_id=result.post_id,
        post_url=result.post_url,
        error=result.error,
        mode=result.metadata.get("mode"),
    )


@router.delete("/linkedin/disconnect")
async def linkedin_disconnect(user_id: int = 1):
    """Disconnect LinkedIn account."""
    service = get_linkedin_service()
    success = await service.disconnect(user_id)
    return {"success": success}


# ============================================
# General Endpoints
# ============================================

@router.get("/status")
async def all_platforms_status(user_id: int = 1):
    """Get status of all social platforms."""
    twitter = get_twitter_service()
    instagram = get_instagram_service()
    linkedin = get_linkedin_service()
    scheduler = get_scheduler_service()
    
    return {
        "platforms": {
            "twitter": {
                "configured": twitter.is_configured(),
                "connected": await twitter.is_authenticated(user_id),
                "auth_type": "credentials",
                "note": "Uses twikit - no API key required!",
            },
            "instagram": {
                "configured": instagram.is_configured(),
                "connected": await instagram.is_authenticated(user_id),
                "auth_type": "oauth",
                "note": "Requires Facebook/Instagram Business account",
            },
            "linkedin": {
                "configured": linkedin.is_configured(),
                "connected": await linkedin.is_authenticated(user_id),
                "auth_type": "oauth",
                "note": "Requires LinkedIn Developer App",
            },
        },
        "scheduler": scheduler.get_status(),
    }


@router.post("/publish/{post_id}")
async def publish_scheduled_post(post_id: int):
    """Manually trigger a scheduled post to publish now."""
    scheduler = get_scheduler_service()
    result = await scheduler.trigger_post_now(post_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result
