"""
Vision Service for ContentOS

AWS Rekognition-first with free fallback:
1. AWS Rekognition - PRIMARY for hackathon
2. Gemini Vision - AI-powered semantic analysis (FREE)
3. OpenCV (local) - FREE fallback for basic analysis

Handles image analysis for content moderation.

Two-pass moderation for edge cases:
- Pass 1: OpenCV (fast color heuristics)
- Pass 2: Gemini Vision (semantic understanding for violence, death, etc.)
"""
import logging
import base64
import re
from typing import Optional, Dict, Any, List
from pathlib import Path

import numpy as np

from config import settings

logger = logging.getLogger(__name__)


class VisionError(Exception):
    """Base exception for vision errors."""
    pass


class VisionService:
    """
    Vision service with AWS Rekognition primary and AI vision fallbacks.
    
    Fallback chain:
    1. AWS Rekognition - PRIMARY (cloud, accurate)
    2. Gemini Vision - AI semantic analysis (FREE, understands context)
    3. Groq Vision - llama-3.2-vision (FREE, good rate limits)
    4. OpenCV - Color heuristics (fast, offline)
    """
    
    def __init__(self):
        self.aws_client = None
        self.gemini_model = None
        self.groq_client = None
        
        # Initialize AWS Rekognition if configured
        if settings.aws_configured and settings.use_aws_rekognition:
            try:
                import boto3
                self.aws_client = boto3.client(
                    'rekognition',
                    region_name=settings.aws_region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                )
                logger.info("AWS Rekognition initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize AWS Rekognition: {e}")
        
        # Initialize Gemini Vision if API key is available
        if settings.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                # Use current model (gemini-1.5-flash is deprecated)
                self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
                logger.info("Gemini Vision initialized for AI-powered image moderation (gemini-2.0-flash)")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Vision: {e}")
        
        # Initialize Groq Vision (llama-3.2-11b-vision) as backup
        if settings.grok_api_key:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=settings.grok_api_key)
                logger.info("Groq Vision initialized (llama-3.2-11b-vision-preview)")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq Vision: {e}")
    
    async def analyze_aws(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image using AWS Rekognition.
        
        Returns moderation labels and confidence scores.
        """
        if not self.aws_client:
            raise VisionError("AWS Rekognition not configured")
        
        try:
            # Detect moderation labels
            moderation_response = self.aws_client.detect_moderation_labels(
                Image={'Bytes': image_bytes},
                MinConfidence=50.0
            )
            
            moderation_labels = [
                {
                    "name": label["Name"],
                    "parent": label.get("ParentName", ""),
                    "confidence": label["Confidence"],
                }
                for label in moderation_response.get("ModerationLabels", [])
            ]
            
            # Detect labels for content understanding
            labels_response = self.aws_client.detect_labels(
                Image={'Bytes': image_bytes},
                MaxLabels=10,
                MinConfidence=70.0
            )
            
            content_labels = [
                {
                    "name": label["Name"],
                    "confidence": label["Confidence"],
                }
                for label in labels_response.get("Labels", [])
            ]
            
            # Calculate safety score (inverse of max moderation confidence)
            max_moderation = max(
                [l["confidence"] for l in moderation_labels],
                default=0
            )
            safety_score = max(0, 100 - max_moderation)
            
            return {
                "safety_score": safety_score,
                "moderation_labels": moderation_labels,
                "content_labels": content_labels,
                "provider": "aws_rekognition",
            }
            
        except Exception as e:
            logger.error(f"AWS Rekognition error: {e}")
            raise VisionError(f"AWS Rekognition failed: {e}")
    
    async def analyze_gemini_vision(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image using Gemini Vision API (FREE).
        
        Uses AI to semantically understand image content - detects:
        - Violence, death scenes, murder
        - Blood, gore, injuries
        - Weapons, dangerous objects
        - Disturbing/distressing content
        - Artistic depictions of violence (paintings, etc.)
        
        This catches content that OpenCV's color-based heuristics miss.
        """
        if not self.gemini_model:
            raise VisionError("Gemini Vision not configured")
        
        try:
            import PIL.Image
            import io
            
            # Convert bytes to PIL Image
            image = PIL.Image.open(io.BytesIO(image_bytes))
            
            # Moderation prompt for comprehensive analysis
            moderation_prompt = """Analyze this image for content moderation. Be thorough and detect:

1. VIOLENCE: Fighting, assault, murder, death scenes, bodies, casualties, war scenes
2. BLOOD/GORE: Blood, injuries, wounds, medical trauma
3. WEAPONS: Guns, knives, explosives, dangerous objects
4. DISTURBING: Distressing scenes, suffering, crime scenes, accidents
5. NSFW: Nudity, sexual content, suggestive poses
6. HATE: Hate symbols, offensive gestures, discriminatory imagery

IMPORTANT: Also detect violence in ARTISTIC content (paintings, drawings, historical art, sculptures).
A classical painting showing a murder or death scene should be flagged as violent content.

Respond in this EXACT format:
SAFETY_SCORE: [0-100, where 100 is completely safe]
VIOLENCE_DETECTED: [YES/NO]
VIOLENCE_TYPE: [describe if detected, or "none"]
NSFW_DETECTED: [YES/NO]
DISTURBING_DETECTED: [YES/NO]
FLAGS: [comma-separated list of detected issues, or "none"]
DESCRIPTION: [brief description of what the image shows]
EXPLANATION: [why this score was given]"""

            response = self.gemini_model.generate_content([moderation_prompt, image])
            response_text = response.text
            
            # Parse the response
            moderation_labels = []
            safety_score = 80  # Default
            content_labels = []
            
            # Extract safety score
            score_match = re.search(r'SAFETY_SCORE:\s*(\d+)', response_text)
            if score_match:
                safety_score = min(100, max(0, int(score_match.group(1))))
            
            # Extract violence detection
            violence_match = re.search(r'VIOLENCE_DETECTED:\s*(YES|NO)', response_text, re.IGNORECASE)
            if violence_match and violence_match.group(1).upper() == 'YES':
                violence_type_match = re.search(r'VIOLENCE_TYPE:\s*(.+?)(?:\n|NSFW)', response_text)
                violence_type = violence_type_match.group(1).strip() if violence_type_match else "Violence detected"
                moderation_labels.append({
                    "name": "Violence",
                    "confidence": max(60, 100 - safety_score),
                    "details": violence_type
                })
            
            # Extract NSFW detection
            nsfw_match = re.search(r'NSFW_DETECTED:\s*(YES|NO)', response_text, re.IGNORECASE)
            if nsfw_match and nsfw_match.group(1).upper() == 'YES':
                moderation_labels.append({
                    "name": "NSFW",
                    "confidence": max(60, 100 - safety_score)
                })
            
            # Extract disturbing content detection
            disturbing_match = re.search(r'DISTURBING_DETECTED:\s*(YES|NO)', response_text, re.IGNORECASE)
            if disturbing_match and disturbing_match.group(1).upper() == 'YES':
                moderation_labels.append({
                    "name": "Disturbing",
                    "confidence": max(50, 100 - safety_score)
                })
            
            # Extract flags
            flags_match = re.search(r'FLAGS:\s*(.+?)(?:\n|DESCRIPTION)', response_text)
            if flags_match and flags_match.group(1).strip().lower() != 'none':
                flags = [f.strip() for f in flags_match.group(1).split(',')]
                for flag in flags:
                    if flag and flag.lower() != 'none':
                        content_labels.append({"name": flag, "confidence": 75})
            
            # Extract description
            description = ""
            desc_match = re.search(r'DESCRIPTION:\s*(.+?)(?:\n|EXPLANATION)', response_text, re.DOTALL)
            if desc_match:
                description = desc_match.group(1).strip()
            
            # Extract explanation
            explanation = ""
            expl_match = re.search(r'EXPLANATION:\s*(.+?)$', response_text, re.DOTALL)
            if expl_match:
                explanation = expl_match.group(1).strip()
            
            logger.info(f"Gemini Vision analysis complete: safety_score={safety_score}, flags={len(moderation_labels)}")
            
            return {
                "safety_score": safety_score,
                "moderation_labels": moderation_labels,
                "content_labels": content_labels,
                "provider": "gemini_vision",
                "description": description,
                "explanation": explanation,
                "raw_analysis": response_text
            }
            
        except Exception as e:
            logger.error(f"Gemini Vision error: {e}")
            raise VisionError(f"Gemini Vision failed: {e}")
    
    async def analyze_opencv(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image using OpenCV (FREE, local).
        
        Uses color space analysis for content detection.
        Balanced approach - avoids false positives on flowers/nature.
        """
        try:
            import cv2
            
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise VisionError("Failed to decode image")
            
            # Convert to different color spaces for analysis
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Analyze color distribution
            h, w = img.shape[:2]
            total_pixels = h * w
            
            # Check for excessive skin tones (heuristic)
            lower_skin = np.array([0, 20, 70], dtype=np.uint8)
            upper_skin = np.array([20, 255, 255], dtype=np.uint8)
            skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
            skin_ratio = np.sum(skin_mask > 0) / total_pixels
            
            # Check for red colors (could be flowers, blood, etc.)
            lower_red1 = np.array([0, 100, 100], dtype=np.uint8)
            upper_red1 = np.array([10, 255, 255], dtype=np.uint8)
            lower_red2 = np.array([160, 100, 100], dtype=np.uint8)
            upper_red2 = np.array([180, 255, 255], dtype=np.uint8)
            red_mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
            red_mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
            red_ratio = (np.sum(red_mask1 > 0) + np.sum(red_mask2 > 0)) / total_pixels
            
            # Check for green (nature/plants - strong positive indicator)
            lower_green = np.array([35, 30, 30], dtype=np.uint8)
            upper_green = np.array([85, 255, 255], dtype=np.uint8)
            green_mask = cv2.inRange(hsv, lower_green, upper_green)
            green_ratio = np.sum(green_mask > 0) / total_pixels
            
            # Check for pink (flowers, but also sometimes suggestive)
            lower_pink = np.array([140, 20, 100], dtype=np.uint8)
            upper_pink = np.array([170, 255, 255], dtype=np.uint8)
            pink_mask = cv2.inRange(hsv, lower_pink, upper_pink)
            pink_ratio = np.sum(pink_mask > 0) / total_pixels
            
            # Check for darkness
            dark_ratio = np.sum(gray < 40) / total_pixels
            
            # Check for bright colors (flowers are usually bright)
            bright_ratio = np.sum(gray > 150) / total_pixels
            
            # Simple heuristic scoring
            moderation_labels = []
            risk_score = 0
            
            # Nature content detection - ANY green is a strong indicator of safe content
            # Flowers have stems, leaves, or are against nature backgrounds
            is_nature_content = green_ratio > 0.05  # Even 5% green suggests nature
            is_flower_like = (red_ratio > 0.1 or pink_ratio > 0.1) and green_ratio > 0.02
            is_bright_colorful = bright_ratio > 0.3 and (red_ratio + pink_ratio + green_ratio) > 0.2
            
            # Safe content indicators
            is_likely_safe = is_nature_content or is_flower_like or is_bright_colorful
            
            # Violence detection - only flag if VERY concerning combinations
            # Must have: high dark + high red + NO green (nature)
            is_potentially_violent = (
                dark_ratio > 0.5 and 
                red_ratio > 0.15 and 
                green_ratio < 0.02 and
                not is_bright_colorful
            )
            
            if is_potentially_violent:
                risk_score += 40
                moderation_labels.append({
                    "name": "Violence",
                    "confidence": 60,
                })
            
            # Suggestive content - high skin ratio with no nature context
            if skin_ratio > 0.6 and not is_nature_content:
                risk_score += 30
                moderation_labels.append({
                    "name": "Suggestive",
                    "confidence": min(skin_ratio * 70, 75),
                })
            
            # If it's likely nature/flower content, ensure high safety score
            if is_likely_safe:
                risk_score = max(0, risk_score - 30)
            
            safety_score = max(0, min(100, 100 - risk_score))
            
            # Content labels for context
            content_labels = []
            if is_nature_content:
                content_labels.append({"name": "Nature", "confidence": 85})
            if is_flower_like:
                content_labels.append({"name": "Flower", "confidence": 80})
            if is_bright_colorful:
                content_labels.append({"name": "Colorful", "confidence": 75})
            
            return {
                "safety_score": safety_score,
                "moderation_labels": moderation_labels,
                "content_labels": content_labels,
                "provider": "opencv",
                "analysis": {
                    "skin_ratio": round(skin_ratio, 3),
                    "red_ratio": round(red_ratio, 3),
                    "green_ratio": round(green_ratio, 3),
                    "pink_ratio": round(pink_ratio, 3),
                    "dark_ratio": round(dark_ratio, 3),
                    "bright_ratio": round(bright_ratio, 3),
                    "is_nature": is_nature_content,
                    "is_flower_like": is_flower_like,
                    "is_likely_safe": is_likely_safe,
                }
            }
            
        except Exception as e:
            logger.error(f"OpenCV analysis error: {e}")
            raise VisionError(f"OpenCV failed: {e}")
    
    async def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image with automatic fallback chain.
        
        Priority: AWS Rekognition → Gemini Vision (AI) → OpenCV (local)
        
        For edge cases (artistic violence, etc.), uses two-pass:
        - Pass 1: Fast provider (OpenCV if no cloud)
        - Pass 2: Gemini Vision verification if safety_score is high but uncertain
        """
        fallback_used = False
        
        # Try AWS Rekognition first (PRIMARY)
        if self.aws_client:
            try:
                logger.info("Analyzing with AWS Rekognition")
                result = await self.analyze_aws(image_bytes)
                result["fallback_used"] = fallback_used
                return result
            except VisionError:
                logger.warning("AWS Rekognition failed, trying Gemini Vision...")
                fallback_used = True
        
        # Try Gemini Vision (AI-powered semantic analysis)
        if self.gemini_model:
            try:
                logger.info("Analyzing with Gemini Vision (AI semantic)")
                result = await self.analyze_gemini_vision(image_bytes)
                result["fallback_used"] = fallback_used
                return result
            except VisionError:
                logger.warning("Gemini Vision failed, using OpenCV fallback")
                fallback_used = True
        
        # Fallback to OpenCV (fast, local, but limited)
        try:
            logger.info("Analyzing with OpenCV")
            opencv_result = await self.analyze_opencv(image_bytes)
            
            # Two-pass verification: If OpenCV says it's safe but we have Gemini,
            # verify with AI for edge cases (artistic violence, etc.)
            if (opencv_result["safety_score"] >= 70 and 
                self.gemini_model and 
                not opencv_result.get("moderation_labels")):
                try:
                    logger.info("Two-pass: Verifying with Gemini Vision for edge cases")
                    gemini_result = await self.analyze_gemini_vision(image_bytes)
                    
                    # If Gemini found issues that OpenCV missed, use lower score
                    if gemini_result["safety_score"] < opencv_result["safety_score"] - 20:
                        logger.warning(f"Gemini detected issues OpenCV missed: {gemini_result.get('moderation_labels')}")
                        gemini_result["fallback_used"] = True
                        gemini_result["opencv_score"] = opencv_result["safety_score"]
                        gemini_result["verification_note"] = "AI verification caught content that color analysis missed"
                        return gemini_result
                except VisionError:
                    pass  # Continue with OpenCV result
            
            opencv_result["fallback_used"] = fallback_used
            return opencv_result
            
        except VisionError as e:
            logger.warning(f"OpenCV also failed: {e}, using simple fallback")
            # Ultimate simple fallback - assume needs review
            return {
                "safety_score": 50,  # Lower default to encourage review
                "moderation_labels": [],
                "content_labels": [],
                "provider": "simple_fallback",
                "fallback_used": True,
                "note": "Analysis unavailable, manual review recommended",
            }
    
    async def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze image from file path."""
        with open(file_path, "rb") as f:
            image_bytes = f.read()
        return await self.analyze(image_bytes)


# Singleton instance
_vision_service: Optional[VisionService] = None


def get_vision_service() -> VisionService:
    """Get or create the vision service singleton."""
    global _vision_service
    if _vision_service is None:
        _vision_service = VisionService()
    return _vision_service
