"""
Content Creation Router for ContentOS

Handles AI-powered content generation - NO AUTH REQUIRED.
- Caption generation
- Summary creation
- Hashtag suggestions
- Tone rewriting
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel

from services.llm_service import get_llm_service, AllProvidersFailedError

logger = logging.getLogger(__name__)
router = APIRouter()

llm = get_llm_service()


class GenerateRequest(BaseModel):
    """Request for content generation."""
    content: str
    content_type: str = "text"
    language: str = "en"


class GenerateResponse(BaseModel):
    """Response with generated content."""
    result: str
    provider: str
    fallback_used: bool


class HashtagsResponse(BaseModel):
    """Response with generated hashtags."""
    hashtags: List[str]
    provider: str


@router.post("/caption", response_model=GenerateResponse)
async def generate_caption(request: GenerateRequest):
    """
    Generate an engaging caption for content.
    
    Uses AWS Bedrock with Grok/Gemini/Ollama fallback.
    NO AUTHENTICATION REQUIRED.
    """
    try:
        result = await llm.generate_caption(request.content, request.content_type)
        return GenerateResponse(
            result=result["text"],
            provider=result["provider"],
            fallback_used=result["fallback_used"],
        )
    except AllProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/summary", response_model=GenerateResponse)
async def generate_summary(request: GenerateRequest):
    """
    Generate a concise summary of content.
    NO AUTHENTICATION REQUIRED.
    """
    try:
        result = await llm.generate_summary(request.content)
        return GenerateResponse(
            result=result["text"],
            provider=result["provider"],
            fallback_used=result["fallback_used"],
        )
    except AllProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/hashtags", response_model=HashtagsResponse)
async def generate_hashtags(
    request: GenerateRequest,
    count: int = 5
):
    """
    Generate relevant hashtags for content.
    NO AUTHENTICATION REQUIRED.
    """
    try:
        result = await llm.generate_hashtags(request.content, count)
        return HashtagsResponse(
            hashtags=result["hashtags"],
            provider=result["provider"],
        )
    except AllProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/rewrite")
async def rewrite_tone(
    content: str = Form(...),
    tone: str = Form("professional"),  # professional, casual, engaging
):
    """
    Rewrite content with a different tone.
    NO AUTHENTICATION REQUIRED.
    """
    prompt = f"""Rewrite the following content in a {tone} tone.
Keep the core message but adjust the style.

Original: {content}

Rewritten ({tone} tone):"""
    
    try:
        result = await llm.generate(prompt, task="rewrite")
        return {
            "original": content,
            "rewritten": result["text"],
            "tone": tone,
            "provider": result["provider"],
        }
    except AllProvidersFailedError as e:
        raise HTTPException(status_code=503, detail=str(e))
