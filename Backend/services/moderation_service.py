"""
Multimodal Moderation Service for ContentOS

Inspired by github.com/Nox-Invicte/Multil-Modal-Moderation-Pipeline
Implements 3-tier architecture:
1. Edge Prefilter (<100ms) - Fast heuristics
2. Deep Analysis (1-8s) - Full AI analysis
3. Decision Layer - Confidence thresholds

AWS-first with free fallbacks for all components.
"""
import logging
import hashlib
import tempfile
import os
from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

from config import settings
from services.llm_service import get_llm_service, AllProvidersFailedError
from services.vision_service import get_vision_service, VisionError
from services.speech_service import get_speech_service, SpeechError

logger = logging.getLogger(__name__)

# Try to import localmod (User provided fallback)
try:
    from localmod import SafetyPipeline
    HAS_LOCALMOD = True
except ImportError:
    HAS_LOCALMOD = False
    logger.warning("LocalMod not installed. Fallback to other services only.")



class ModerationDecision(str, Enum):
    """Moderation decision outcomes."""
    ALLOW = "ALLOW"
    FLAG = "FLAG"
    ESCALATE = "ESCALATE"


class ContentType(str, Enum):
    """Content types for moderation."""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


@dataclass
class ModerationResult:
    """Structured moderation result."""
    decision: ModerationDecision
    safety_score: float
    confidence: float
    explanation: str
    flags: List[str]
    evidence: List[Dict[str, Any]]
    provider: str
    processing_time_ms: int
    fallback_used: bool


class ModerationCache:
    """Simple in-memory cache for moderation results."""
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, ModerationResult] = {}
        self.max_size = max_size
    
    def _hash_content(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()
    
    def get(self, content: bytes) -> Optional[ModerationResult]:
        key = self._hash_content(content)
        return self.cache.get(key)
    
    def set(self, content: bytes, result: ModerationResult) -> None:
        if len(self.cache) >= self.max_size:
            # Simple eviction: clear half
            keys = list(self.cache.keys())[:len(self.cache)//2]
            for k in keys:
                del self.cache[k]
        
        key = self._hash_content(content)
        self.cache[key] = result


class ModerationService:
    """
    Multimodal content moderation with 3-tier architecture.
    
    Tier 1: Edge Prefilter (fast heuristics)
    Tier 2: Deep Analysis (AI-powered)
    Tier 3: Decision Engine (thresholds + escalation)
    """
    
    # Thresholds
    SAFE_THRESHOLD = 70
    FLAG_THRESHOLD = 40
    
    def __init__(self):
        self.llm = get_llm_service()
        self.vision = get_vision_service()
        self.speech = get_speech_service()
        self.cache = ModerationCache()
        
        # AWS Comprehend for text toxicity
        self.comprehend_client = None
        if settings.aws_configured and settings.use_aws_comprehend:
            try:
                import boto3
                self.comprehend_client = boto3.client(
                    'comprehend',
                    region_name=settings.aws_region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                )
                logger.info("AWS Comprehend initialized for toxicity detection")
            except Exception as e:
                logger.warning(f"Failed to initialize AWS Comprehend: {e}")
        
            except Exception as e:
                logger.warning(f"Failed to initialize AWS Comprehend: {e}")
        
        # LocalMod (Secondary Fallback)
        self.localmod_pipeline = None
        if HAS_LOCALMOD:
            try:
                # Initialize localmod pipeline
                self.localmod_pipeline = SafetyPipeline()
                logger.info("LocalMod initialized and ready")
            except Exception as e:
                logger.warning(f"Failed to initialize LocalMod: {e}")

        # OpenCV / Yahoo Open NSFW (Primary Offline)
        self.opencv_net = None
        try:
            self._ensure_opencv_models()
            import cv2
            model_dir = os.path.join(os.getcwd(), "ml_models")
            proto_path = os.path.join(model_dir, "nsfw.prototxt")
            model_path = os.path.join(model_dir, "nsfw.caffemodel")
            self.opencv_net = cv2.dnn.readNetFromCaffe(proto_path, model_path)
            logger.info("OpenCV NSFW model initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenCV NSFW model: {e}")

    def _ensure_opencv_models(self):
        """Download Yahoo Open NSFW pre-trained models."""
        import requests
        model_dir = os.path.join(os.getcwd(), "ml_models")
        os.makedirs(model_dir, exist_ok=True)
        
        files = {
            "nsfw.prototxt": "https://raw.githubusercontent.com/yahoo/open_nsfw/master/nsfw_model/deploy.prototxt",
            "nsfw.caffemodel": "https://github.com/yahoo/open_nsfw/raw/master/nsfw_model/resnet_50_1by2_nsfw.caffemodel"
        }
        
        for fname, url in files.items():
            path = os.path.join(model_dir, fname)
            if not os.path.exists(path):
                logger.info(f"Downloading {fname} from GitHub...")
                try:
                    r = requests.get(url, stream=True)
                    r.raise_for_status()
                    with open(path, "wb") as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                    logger.info(f"Downloaded {fname}")
                except Exception as e:
                    logger.error(f"Failed to download {fname}: {e}")
                    raise
    
    # ===========================================
    # Tier 1: Edge Prefilter
    # ===========================================
    
    async def prefilter_text(self, text: str) -> Dict[str, Any]:
        """
        Fast text prefiltering using keyword detection.
        """
        # Common offensive patterns (simplified for demo)
        offensive_keywords = [
            "hate", "kill", "violence", "attack", "terrorist",
            "abuse", "threat", "bomb", "weapon", "murder"
        ]
        
        text_lower = text.lower()
        found = [kw for kw in offensive_keywords if kw in text_lower]
        
        if len(found) >= 3:
            return {"risk": "HIGH", "flags": found, "proceed": True}
        elif len(found) >= 1:
            return {"risk": "MEDIUM", "flags": found, "proceed": True}
        else:
            return {"risk": "LOW", "flags": [], "proceed": False}
    
    async def prefilter_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Fast image prefiltering using color analysis.
        """
        try:
            import cv2
            import numpy as np
            
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return {"risk": "UNKNOWN", "proceed": True}
            
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            h, w = img.shape[:2]
            total = h * w
            
            # Check skin tone ratio
            lower_skin = np.array([0, 20, 70], dtype=np.uint8)
            upper_skin = np.array([20, 255, 255], dtype=np.uint8)
            skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
            skin_ratio = np.sum(skin_mask > 0) / total
            
            if skin_ratio > 0.5:
                return {"risk": "HIGH", "reason": "high_skin_ratio", "proceed": True}
            elif skin_ratio > 0.3:
                return {"risk": "MEDIUM", "reason": "moderate_skin_ratio", "proceed": True}
            
            return {"risk": "LOW", "proceed": False}
            
        except Exception as e:
            logger.warning(f"Prefilter error: {e}")
            return {"risk": "UNKNOWN", "proceed": True}
    
    # ===========================================
    # Tier 2: Deep Analysis
    # ===========================================
    
    async def analyze_text_aws(self, text: str) -> Dict[str, Any]:
        """Analyze text toxicity using AWS Comprehend."""
        if not self.comprehend_client:
            raise Exception("AWS Comprehend not available")
        
        try:
            response = self.comprehend_client.detect_toxic_content(
                TextSegments=[{"Text": text}],
                LanguageCode="en"
            )
            
            results = response.get("ResultList", [{}])[0]
            toxicity = results.get("Toxicity", 0)
            labels = results.get("Labels", [])
            
            flags = [
                label["Name"] 
                for label in labels 
                if label.get("Score", 0) > 0.5
            ]
            
            return {
                "safety_score": (1 - toxicity) * 100,
                "flags": flags,
                "provider": "aws_comprehend",
            }
            
        except Exception as e:
            logger.error(f"AWS Comprehend error: {e}")
            raise
    
    async def analyze_text_local(self, text: str) -> Dict[str, Any]:
        """Analyze text using LocalMod (Offline API)."""
        if not self.localmod_pipeline:
            raise Exception("LocalMod not available")
        
        try:
            import asyncio
            # Run in threadpool to avoid blocking
            report = await asyncio.to_thread(self.localmod_pipeline.analyze, text)
            
            # Map LocalMod report to standard format
            # Assuming report has .flagged, .severity, .results or similar based on docs
            # Adapting to generic structure if specific attributes aren't known
            
            # Based on README: report.flagged (bool), report.severity exists
            flags = []
            if hasattr(report, 'results'):
                for res in report.results:
                    if isinstance(res, dict) and res.get('flagged'):
                        flags.append(res.get('classifier', 'unknown'))
            elif hasattr(report, 'flagged') and report.flagged:
                flags.append("unsafe_content")

            safety_score = 100
            if hasattr(report, 'flagged') and report.flagged:
                # heuristics based on severity
                severity = str(getattr(report, 'severity', 'low')).lower()
                if severity == 'high':
                    safety_score = 10
                elif severity == 'medium':
                    safety_score = 40
                else:
                    safety_score = 60
            
            return {
                "safety_score": safety_score,
                "flags": flags,
                "provider": "localmod",
            }
        except Exception as e:
            logger.error(f"LocalMod text analysis error: {e}")
            raise
    
    async def analyze_text_llm(self, text: str) -> Dict[str, Any]:
        """Analyze text using LLM (fallback)."""
        prompt = f"""Analyze the following text for content safety.
Rate it on a scale of 0-100 where 100 is completely safe.
List any concerning content categories (hate speech, violence, harassment, etc.).

Text: {text}

Respond in this exact format:
SAFETY_SCORE: [number]
FLAGS: [comma-separated list or "none"]
EXPLANATION: [brief explanation]"""
        
        try:
            result = await self.llm.generate(prompt, task="moderation")
            response_text = result["text"]
            
            # Parse response
            lines = response_text.strip().split("\n")
            safety_score = 75  # Default
            flags = []
            explanation = ""
            
            for line in lines:
                if "SAFETY_SCORE:" in line:
                    try:
                        score_str = line.split(":")[-1].strip()
                        safety_score = float(score_str.replace("%", ""))
                    except:
                        pass
                elif "FLAGS:" in line:
                    flag_str = line.split(":")[-1].strip()
                    if flag_str.lower() != "none":
                        flags = [f.strip() for f in flag_str.split(",")]
                elif "EXPLANATION:" in line:
                    explanation = line.split(":", 1)[-1].strip()
            
            return {
                "safety_score": safety_score,
                "flags": flags,
                "explanation": explanation,
                "provider": result["provider"],
            }
            
        except AllProvidersFailedError:
            # Ultimate fallback: assume safe with warning
            return {
                "safety_score": 70,
                "flags": ["analysis_unavailable"],
                "explanation": "AI analysis unavailable, manual review recommended",
                "provider": "fallback",
            }
    
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze text with AWS primary and LLM fallback."""
        # Try AWS Comprehend first
        if self.comprehend_client:
            try:
                return await self.analyze_text_aws(text)
            except Exception:
                logger.warning("AWS Comprehend failed, using LocalMod/LLM fallback")
        
        # Try LocalMod (Primary Fallback)
        if self.localmod_pipeline:
            try:
                return await self.analyze_text_local(text)
            except Exception as e:
                logger.warning(f"LocalMod text failed: {e}")
        
        # Fallback to LLM
        return await self.analyze_text_llm(text)
    
    async def analyze_image_local(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze image using LocalMod."""
        if not self.localmod_pipeline:
            raise Exception("LocalMod not available")
        
        try:
            import asyncio
            from PIL import Image
            import io
            
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Run in threadpool
            # Guessing method name based on README '/analyze/image' -> likely analyze_image or analyze(image=...)
            # We'll try analyze_image first, then check if analyze supports image
            
            if hasattr(self.localmod_pipeline, 'analyze_image'):
                report = await asyncio.to_thread(self.localmod_pipeline.analyze_image, image)
            else:
                # Fallback guess: analyze accepts image argument
                report = await asyncio.to_thread(self.localmod_pipeline.analyze, image=image)
                
            flags = []
            safety_score = 100
            
            # logic similar to text
            if hasattr(report, 'flagged') and report.flagged:
                safety_score = 30 # Default low score if flagged
                if hasattr(report, 'results'):
                    for res in report.results:
                        if isinstance(res, dict) and res.get('flagged'):
                            flags.append(res.get('classifier', 'nsfw'))
                            
            return {
                "safety_score": safety_score,
                "flags": flags,
                "provider": "localmod_image",
            }
            
        except Exception as e:
            logger.error(f"LocalMod image analysis error: {e}")
            raise

    async def analyze_image_opencv(self, image_bytes: bytes) -> Dict[str, Any]:
        """Analyze image using OpenCV and Yahoo Open NSFW model."""
        if not self.opencv_net:
            raise Exception("OpenCV model not available")
            
        try:
            import cv2
            import numpy as np
            
            # Decode image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Could not decode image")

            # Preprocess for Caffe model (Yahoo Open NSFW)
            # Resize into 224x224
            # Mean subtraction: 104, 117, 123 (BGR)
            blob = cv2.dnn.blobFromImage(
                img, 
                1.0, 
                (224, 224), 
                (104, 117, 123), 
                swapRB=False, 
                crop=False
            )
            
            # Forward pass
            # Run in threadpool to avoid blocking
            import asyncio
            def _predict():
                self.opencv_net.setInput(blob)
                return self.opencv_net.forward()
            
            preds = await asyncio.to_thread(_predict)
            
            # Output is [Safe Score, NSFW Score] (Softmax)
            nsfw_score = float(preds[0][1])
            safe_score = float(preds[0][0])
            
            # Use NSFW score (0-1) to calculate safety (0-100)
            safety = (1.0 - nsfw_score) * 100
            
            flags = []
            if nsfw_score > 0.8:
                flags.append("explicit_nudity")
            elif nsfw_score > 0.2:
                flags.append("suggestive")
            
            return {
                "safety_score": safety,
                "flags": flags,
                "provider": "opencv_nsfw_resnet",
                "raw_nsfw": nsfw_score
            }
            
        except Exception as e:
            logger.error(f"OpenCV analysis error: {e}")
            raise

    async def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image with multiple providers in parallel.
        Returns the most conservative result (lowest safety score).
        """
        import asyncio
        tasks = []
        
        # 1. OpenCV Task
        if self.opencv_net:
            tasks.append(self.analyze_image_opencv(image_bytes))
            
        # 2. AWS Task
        if hasattr(self.vision, 'analyze') and getattr(self.vision, 'analyze') and settings.aws_configured:
            tasks.append(self.vision.analyze(image_bytes))
            
        # 3. LocalMod (Include in parallel if available, or as fallback? 
        # Parallel is faster if we have the resources)
        if self.localmod_pipeline:
            tasks.append(self.analyze_image_local(image_bytes))
            
        if not tasks:
            return {"safety_score": 0, "flags": ["configuration_error"], "provider": "error"}

        try:
            # Run all configured providers with a timeout
            # return_exceptions=True ensures one failure doesn't kill the batch
            results_or_errors = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True), 
                timeout=5.0
            )
            
            valid_results = []
            for res in results_or_errors:
                if isinstance(res, dict) and "safety_score" in res:
                    valid_results.append(res)
                elif isinstance(res, Exception):
                    logger.warning(f"Moderation provider failed: {res}")

            if not valid_results:
                return {"safety_score": 0, "flags": ["analysis_failed"], "provider": "error"}

            # Aggregation: Take the result with the lowest safety score (Max Safety Mode)
            best_result = min(valid_results, key=lambda x: x["safety_score"])
            
            # Combine flags from all providers for maximum awareness
            all_flags = []
            for r in valid_results:
                all_flags.extend(r.get("flags", []))
            
            if all_flags and best_result["safety_score"] > 80:
                # If flags found but score is high, forcibly lower it slightly
                best_result["safety_score"] = 75
            
            best_result["flags"] = list(set(all_flags))
            best_result["provider"] = f"ensemble({len(valid_results)})"
            
            return best_result

        except asyncio.TimeoutError:
            logger.error("Moderation timed out")
            return {"safety_score": 0, "flags": ["timeout"], "provider": "timeout"}
        except Exception as e:
            logger.error(f"Moderation error: {e}")
            return {"safety_score": 0, "flags": ["system_error"], "provider": "error"}
    
    async def analyze_audio(self, audio_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Analyze audio by:
        1. Transcribing to text
        2. Analyzing transcript for toxicity
        """
        # Transcribe
        transcript_result = await self.speech.transcribe_bytes(audio_bytes, filename)
        transcript = transcript_result["text"]
        
        # Analyze transcript
        text_result = await self.analyze_text(transcript)
        
        return {
            "transcript": transcript,
            "segments": transcript_result.get("segments", []),
            "safety_score": text_result["safety_score"],
            "flags": text_result["flags"],
            "provider": f"speech:{transcript_result['provider']}+text:{text_result['provider']}",
        }
    
    # ===========================================
    # Tier 3: Decision Engine
    # ===========================================
    
    def make_decision(
        self,
        safety_score: float,
        flags: List[str]
    ) -> ModerationDecision:
        """
        Make final moderation decision based on score and flags.
        """
        # Critical flags always escalate
        critical_flags = ["child_abuse", "terrorism", "self_harm"]
        if any(f.lower() in str(flags).lower() for f in critical_flags):
            return ModerationDecision.ESCALATE
        
        if safety_score >= self.SAFE_THRESHOLD:
            return ModerationDecision.ALLOW
        elif safety_score >= self.FLAG_THRESHOLD:
            return ModerationDecision.FLAG
        else:
            return ModerationDecision.ESCALATE
    
    # ===========================================
    # Main Moderation Entry Points
    # ===========================================
    
    async def moderate_text(self, text: str) -> Dict[str, Any]:
        """
        Full moderation pipeline for text content.
        """
        start_time = datetime.now()
        fallback_used = False
        
        # Tier 1: Prefilter
        prefilter = await self.prefilter_text(text)
        
        # Tier 2: Deep analysis (if needed or always for demo)
        analysis = await self.analyze_text(text)
        
        # Tier 3: Decision
        decision = self.make_decision(
            analysis["safety_score"],
            analysis.get("flags", [])
        )
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return {
            "decision": decision.value,
            "safety_score": analysis["safety_score"],
            "confidence": 0.85,  # Placeholder
            "explanation": analysis.get("explanation", f"Content analyzed with {len(analysis.get('flags', []))} flags detected"),
            "flags": analysis.get("flags", []),
            "evidence": [],
            "provider": analysis.get("provider", "unknown"),
            "processing_time_ms": processing_time,
            "prefilter_risk": prefilter.get("risk", "UNKNOWN"),
        }
    
    async def moderate_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """Full moderation pipeline for image content."""
        start_time = datetime.now()
        
        # Check cache
        cached = self.cache.get(image_bytes)
        if cached:
            return {
                "decision": cached.decision.value,
                "safety_score": cached.safety_score,
                "cached": True,
            }
        
        # Tier 1: Prefilter
        prefilter = await self.prefilter_image(image_bytes)
        
        # Tier 2: Deep analysis
        analysis = await self.analyze_image(image_bytes)
        
        # Tier 3: Decision
        flags = [l["name"] for l in analysis.get("moderation_labels", [])]
        decision = self.make_decision(analysis["safety_score"], flags)
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        result = {
            "decision": decision.value,
            "safety_score": analysis["safety_score"],
            "confidence": 0.9 if analysis["provider"] == "aws_rekognition" else 0.7,
            "explanation": f"Image analyzed: {len(flags)} moderation flags detected",
            "flags": flags,
            "content_labels": [l["name"] for l in analysis.get("content_labels", [])],
            "provider": analysis["provider"],
            "processing_time_ms": processing_time,
            "prefilter_risk": prefilter.get("risk", "UNKNOWN"),
            "fallback_used": analysis.get("fallback_used", False),
        }
        
        return result
    
    async def moderate_audio(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav"
    ) -> Dict[str, Any]:
        """Full moderation pipeline for audio content."""
        start_time = datetime.now()
        
        # Analyze audio (transcribe + text analysis)
        analysis = await self.analyze_audio(audio_bytes, filename)
        
        # Decision
        decision = self.make_decision(
            analysis["safety_score"],
            analysis.get("flags", [])
        )
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Find flagged timestamps
        flagged_segments = []
        if analysis.get("flags") and analysis.get("segments"):
            # Simple: flag all segments if content is flagged
            for seg in analysis["segments"]:
                flagged_segments.append({
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"],
                    "flags": analysis["flags"],
                })
        
        return {
            "decision": decision.value,
            "safety_score": analysis["safety_score"],
            "confidence": 0.8,
            "explanation": f"Audio analyzed: {len(analysis.get('flags', []))} issues detected",
            "flags": analysis.get("flags", []),
            "transcript": analysis.get("transcript", ""),
            "flagged_segments": flagged_segments,
            "provider": analysis["provider"],
            "processing_time_ms": processing_time,
        }


# Singleton instance
_moderation_service: Optional[ModerationService] = None


def get_moderation_service() -> ModerationService:
    """Get or create the moderation service singleton."""
    global _moderation_service
    if _moderation_service is None:
        _moderation_service = ModerationService()
    return _moderation_service
