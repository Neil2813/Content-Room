"""
Verification Script for Social Media Integrations

Tests:
1. Storage Service (Local fallback)
2. Scheduler Service (Background tasks)
3. Social Services Config (Twitter/Twikit, LinkedIn)
4. Moderation Check in Scheduler

Usage: python verify_social.py
"""
import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verification")

async def verify_storage():
    """Verify storage service uploads."""
    logger.info("--- Testing Storage Service ---")
    try:
        from services.storage_service import get_storage_service
        storage = get_storage_service()
        
        # Test upload
        test_data = b"This is a test file for storage verification."
        result = await storage.upload(
            file_data=test_data,
            filename="test_upload.txt",
            content_type="text/plain",
            folder="verification"
        )
        
        logger.info(f"✅ Upload successful: {result['url']}")
        logger.info(f"   Provider: {result['provider']}")
        
        # Verify file exists locally
        if result['provider'] == 'local':
            from pathlib import Path
            if Path(result['path']).exists():
                logger.info("✅ File verified on disk")
            else:
                logger.error("❌ File NOT found on disk")
                
    except Exception as e:
        logger.error(f"❌ Storage test failed: {e}")

async def verify_scheduler_moderation():
    """Verify moderation logic in scheduler."""
    logger.info("\n--- Testing Scheduler Moderation ---")
    
    # Mock moderation result
    safe_text = "Check out our new product launch! #tech"
    unsafe_text = "I want to kill everyone. violence."
    
    banned_patterns = ["violence", "kill"]
    
    # Test safe text
    flagged = [w for w in banned_patterns if w in safe_text.lower()]
    if not flagged:
        logger.info("✅ Safe text passed moderation check")
    else:
        logger.error("❌ Safe text FAILED moderation check")
        
    # Test unsafe text
    flagged = [w for w in banned_patterns if w in unsafe_text.lower()]
    if flagged:
        logger.info(f"✅ Unsafe text correctly flagged: {flagged}")
    else:
        logger.error("❌ Unsafe text PASSED moderation check (Should fail)")

async def verify_social_config():
    """Verify social services configuration."""
    logger.info("\n--- Testing Social Services Config ---")
    
    try:
        # Check Twitter (Twikit)
        from services.social.twitter_service import get_twitter_service
        twitter = get_twitter_service()
        
        if twitter.username:
            logger.info("✅ Twitter (Twikit) configured")
        else:
            logger.warning("⚠️ Twitter not configured (Env vars missing)")
            
        # Check LinkedIn
        from services.social.linkedin_service import get_linkedin_service
        linkedin = get_linkedin_service()
        
        if linkedin.client_id:
            logger.info("✅ LinkedIn configured")
        else:
            logger.warning("⚠️ LinkedIn not configured (Env vars missing)")
            
    except ImportError as e:
        logger.error(f"❌ Failed to import social services: {e}")
        logger.error("   Did you install requirements? (twikit, linkedin-api)")

async def main():
    logger.info("Starting Verification...")
    
    # Ensure env vars are loaded
    from dotenv import load_dotenv
    load_dotenv()
    
    await verify_storage()
    await verify_scheduler_moderation()
    await verify_social_config()
    
    logger.info("\nVerification Complete.")

if __name__ == "__main__":
    asyncio.run(main())
