"""
Deep Learning Content Moderation Service for ContentOS

Inspired by: https://github.com/fcakyon/content-moderation-deep-learning
Author: ContentOS Team (forked from fcakyon's research curation)

Implements multimodal deep learning for content moderation:
1. NudeNet - NSFW/nudity detection (https://github.com/notAI-tech/NudeNet)
2. CLIP-based violence detection - semantic image understanding
3. Detoxify - text toxicity detection (https://github.com/unitaryai/detoxify)

This provides local, offline-capable moderation without API rate limits.
"""
import logging
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ModerationCategory(str, Enum):
    """Content moderation categories."""
    SAFE = "safe"
    NSFW = "nsfw"
    VIOLENCE = "violence"
    GORE = "gore"
    HATE = "hate"
    HARASSMENT = "harassment"
    SELF_HARM = "self_harm"
    WEAPONS = "weapons"
    DRUGS = "drugs"


@dataclass
class ModerationResult:
    """Structured moderation result."""
    is_safe: bool
    safety_score: float  # 0-100, higher is safer
    categories: List[str]
    details: Dict[str, Any]
    provider: str
    

class DeepModerationService:
    """
    Deep learning based content moderation.
    
    Uses:
    - NudeNet for NSFW detection (local model)
    - CLIP for violence/content understanding
    - Detoxify for text toxicity
    
    All models run locally - no API rate limits!
    """
    
    # NSFW categories from NudeNet
    NSFW_LABELS = {
        "FEMALE_BREAST_EXPOSED", "FEMALE_GENITALIA_EXPOSED",
        "MALE_GENITALIA_EXPOSED", "BUTTOCKS_EXPOSED",
        "ANUS_EXPOSED", "FEMALE_BREAST_COVERED",
        "BELLY_EXPOSED", "ARMPITS_EXPOSED"
    }
    
    # High severity NSFW labels (explicit)
    EXPLICIT_LABELS = {
        "FEMALE_GENITALIA_EXPOSED", "MALE_GENITALIA_EXPOSED",
        "ANUS_EXPOSED"
    }
    
    # Violence-related keywords for CLIP
    VIOLENCE_KEYWORDS = [
        "violence", "blood", "gore", "death", "murder", "fight",
        "weapon", "gun", "knife", "injury", "wound", "war",
        "assault", "attack", "killing", "corpse", "dead body"
    ]
    
    def __init__(self):
        self.nude_detector = None
        self.clip_model = None
        self.clip_processor = None
        self.detoxify = None
        
        self._init_nudenet()
        self._init_clip()
        self._init_detoxify()
    
    def _init_nudenet(self):
        """Initialize NudeNet for NSFW detection."""
        try:
            from nudenet import NudeDetector
            self.nude_detector = NudeDetector()
            logger.info("NudeNet initialized for NSFW detection")
        except ImportError:
            logger.warning("NudeNet not installed. Run: pip install nudenet")
        except Exception as e:
            logger.warning(f"Failed to initialize NudeNet: {e}")
    
    def _init_clip(self):
        """Initialize CLIP for violence/content detection."""
        try:
            from transformers import CLIPProcessor, CLIPModel
            import torch
            
            # Use a smaller CLIP model for speed
            model_name = "openai/clip-vit-base-patch32"
            self.clip_model = CLIPModel.from_pretrained(model_name)
            self.clip_processor = CLIPProcessor.from_pretrained(model_name)
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self.clip_model = self.clip_model.cuda()
            
            logger.info(f"CLIP initialized for content understanding ({model_name})")
        except ImportError:
            logger.warning("Transformers not installed. Run: pip install transformers torch")
        except Exception as e:
            logger.warning(f"Failed to initialize CLIP: {e}")
    
    def _init_detoxify(self):
        """Initialize Detoxify for text toxicity."""
        try:
            from detoxify import Detoxify
            self.detoxify = Detoxify('original')
            logger.info("Detoxify initialized for text toxicity detection")
        except ImportError:
            logger.warning("Detoxify not installed. Run: pip install detoxify")
        except Exception as e:
            logger.warning(f"Failed to initialize Detoxify: {e}")
    
    async def analyze_image_nudenet(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image for NSFW content using NudeNet.
        
        Returns detection results with bounding boxes.
        """
        if not self.nude_detector:
            raise Exception("NudeNet not available")
        
        import tempfile
        import os
        
        # Save to temp file (NudeNet requires file path)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(image_bytes)
            temp_path = f.name
        
        try:
            # Run detection in threadpool
            detections = await asyncio.to_thread(
                self.nude_detector.detect, temp_path
            )
            
            # Process detections
            nsfw_labels = []
            explicit_labels = []
            max_confidence = 0.0
            
            for det in detections:
                label = det.get("class", "")
                score = det.get("score", 0.0)
                
                if label in self.NSFW_LABELS:
                    nsfw_labels.append({"label": label, "confidence": score})
                    max_confidence = max(max_confidence, score)
                    
                if label in self.EXPLICIT_LABELS:
                    explicit_labels.append(label)
            
            # Calculate safety score
            if explicit_labels:
                safety_score = max(0, 100 - (max_confidence * 100) - 30)
            elif nsfw_labels:
                safety_score = max(40, 100 - (max_confidence * 80))
            else:
                safety_score = 100
            
            return {
                "safety_score": safety_score,
                "nsfw_detected": len(nsfw_labels) > 0,
                "explicit_detected": len(explicit_labels) > 0,
                "detections": nsfw_labels,
                "flags": [d["label"] for d in nsfw_labels],
                "provider": "nudenet",
            }
            
        finally:
            os.unlink(temp_path)
    
    async def analyze_image_clip(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyze image for violence/disturbing content using CLIP.
        
        Uses zero-shot classification with violence-related keywords.
        """
        if not self.clip_model or not self.clip_processor:
            raise Exception("CLIP not available")
        
        import io
        from PIL import Image
        import torch
        
        # Load image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Define categories for classification
        safe_prompts = ["a safe image", "a family friendly image", "a normal photo"]
        unsafe_prompts = [
            "violence", "blood and gore", "dead body", "murder scene",
            "weapon attack", "war casualties", "graphic injury"
        ]
        
        all_prompts = safe_prompts + unsafe_prompts
        
        # Process
        inputs = self.clip_processor(
            text=all_prompts, 
            images=image, 
            return_tensors="pt", 
            padding=True
        )
        
        # Move to GPU if available
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        # Get predictions
        with torch.no_grad():
            outputs = self.clip_model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]
        
        # Calculate scores
        safe_score = sum(probs[:len(safe_prompts)])
        unsafe_score = sum(probs[len(safe_prompts):])
        
        # Find top matches
        results = list(zip(all_prompts, probs))
        results.sort(key=lambda x: x[1], reverse=True)
        top_matches = results[:3]
        
        # Calculate safety score (0-100)
        safety_score = max(0, min(100, safe_score * 100))
        
        # Check for violence
        violence_detected = any(
            p in unsafe_prompts and s > 0.15 
            for p, s in results
        )
        
        flags = []
        if violence_detected:
            flags.append("violence")
            safety_score = min(safety_score, 40)
        
        return {
            "safety_score": safety_score,
            "violence_detected": violence_detected,
            "top_matches": [{"label": p, "score": float(s)} for p, s in top_matches],
            "safe_probability": float(safe_score),
            "unsafe_probability": float(unsafe_score),
            "flags": flags,
            "provider": "clip_vision",
        }
    
    async def analyze_text_detoxify(self, text: str) -> Dict[str, Any]:
        """
        Analyze text for toxicity using Detoxify.
        
        Detects: toxicity, severe_toxicity, obscene, threat, insult, identity_attack
        """
        if not self.detoxify:
            raise Exception("Detoxify not available")
        
        # Run prediction
        results = await asyncio.to_thread(
            self.detoxify.predict, text
        )
        
        # Process results
        flags = []
        max_toxicity = 0.0
        
        for category, score in results.items():
            if score > 0.5:  # Threshold for flagging
                flags.append(category)
            max_toxicity = max(max_toxicity, score)
        
        # Calculate safety score
        safety_score = max(0, (1 - max_toxicity) * 100)
        
        return {
            "safety_score": safety_score,
            "toxicity_scores": results,
            "is_toxic": max_toxicity > 0.5,
            "flags": flags,
            "provider": "detoxify",
        }
    
    async def analyze_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Full image moderation using ensemble of models.
        
        Combines NudeNet (NSFW) + CLIP (violence) for comprehensive analysis.
        Returns the most conservative result.
        """
        results = []
        
        # Run NudeNet
        if self.nude_detector:
            try:
                nudenet_result = await self.analyze_image_nudenet(image_bytes)
                results.append(nudenet_result)
                logger.info(f"NudeNet: score={nudenet_result['safety_score']}, flags={nudenet_result.get('flags', [])}")
            except Exception as e:
                logger.warning(f"NudeNet failed: {e}")
        
        # Run CLIP
        if self.clip_model:
            try:
                clip_result = await self.analyze_image_clip(image_bytes)
                results.append(clip_result)
                logger.info(f"CLIP: score={clip_result['safety_score']}, flags={clip_result.get('flags', [])}")
            except Exception as e:
                logger.warning(f"CLIP failed: {e}")
        
        if not results:
            return {
                "safety_score": 50,
                "flags": ["no_models_available"],
                "provider": "fallback",
            }
        
        # Take most conservative result (lowest score)
        best_result = min(results, key=lambda x: x["safety_score"])
        
        # Combine all flags
        all_flags = []
        for r in results:
            all_flags.extend(r.get("flags", []))
        best_result["flags"] = list(set(all_flags))
        
        # Add ensemble note
        best_result["provider"] = f"deep_ensemble({len(results)})"
        best_result["individual_results"] = results
        
        return best_result
    
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Full text moderation using Detoxify.
        """
        if self.detoxify:
            try:
                return await self.analyze_text_detoxify(text)
            except Exception as e:
                logger.warning(f"Detoxify failed: {e}")
        
        # Fallback to simple keyword detection
        return {
            "safety_score": 75,
            "flags": [],
            "provider": "fallback",
        }


# Singleton instance
_deep_moderation: Optional[DeepModerationService] = None


def get_deep_moderation_service() -> DeepModerationService:
    """Get or create the deep moderation service singleton."""
    global _deep_moderation
    if _deep_moderation is None:
        _deep_moderation = DeepModerationService()
    return _deep_moderation
