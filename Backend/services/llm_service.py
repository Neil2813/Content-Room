"""
LLM Service for ContentOS

AWS Bedrock-first with automatic fallback chain:
1. AWS Bedrock (Claude/Titan) - PRIMARY for hackathon
2. Grok (X.AI) - First fallback
3. Gemini (Google) - Second fallback (FREE: 60 QPM)
4. Ollama (Local) - Offline mode
5. Simple Templates - ULTIMATE fallback (no API needed)

Each provider is tried in order until one succeeds.
"""
import logging
import random
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from enum import Enum

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    """Available LLM providers."""
    AWS_BEDROCK = "aws_bedrock"
    GROK = "grok"
    GEMINI = "gemini"
    OLLAMA = "ollama"
    SIMPLE = "simple_template"


class LLMError(Exception):
    """Base exception for LLM errors."""
    pass


class ProviderUnavailableError(LLMError):
    """Raised when a provider is unavailable."""
    pass


class AllProvidersFailedError(LLMError):
    """Raised when all providers fail."""
    pass


# ===========================================
# Provider Implementations
# ===========================================

class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text completion."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is configured and available."""
        pass


class AWSBedrockProvider(BaseLLMProvider):
    """
    AWS Bedrock provider using Claude or Titan.
    PRIMARY for AWS hackathon.
    """
    
    def __init__(self):
        self.client = None
        if self.is_available():
            try:
                import boto3
                self.client = boto3.client(
                    'bedrock-runtime',
                    region_name=settings.aws_region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                )
                logger.info("AWS Bedrock provider initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize AWS Bedrock: {e}")
    
    def is_available(self) -> bool:
        return settings.aws_configured and settings.use_aws_bedrock
    
    async def generate(self, prompt: str, model: str = "anthropic.claude-3-sonnet-20240229-v1:0", **kwargs) -> str:
        if not self.client:
            raise ProviderUnavailableError("AWS Bedrock not configured")
        
        try:
            import json
            
            # Claude format for Bedrock
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": kwargs.get("max_tokens", 1024),
                "messages": [{"role": "user", "content": prompt}]
            })
            
            response = self.client.invoke_model(
                modelId=model,
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            
            result = json.loads(response['body'].read())
            return result['content'][0]['text']
            
        except Exception as e:
            logger.error(f"AWS Bedrock error: {e}")
            raise ProviderUnavailableError(f"AWS Bedrock failed: {e}")


class GrokProvider(BaseLLMProvider):
    """
    Groq provider using Groq Cloud API.
    Fast inference with open-source models.
    First fallback when AWS is unavailable.
    
    Note: Uses GROQ_API_KEY (gsk_*) from groq.com, not X.AI Grok.
    """
    
    def __init__(self):
        self.api_key = settings.grok_api_key  # Same env var, works for Groq
        self.base_url = "https://api.groq.com/openai/v1"  # Groq API endpoint
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    async def generate(self, prompt: str, model: str = "llama-3.3-70b-versatile", **kwargs) -> str:
        if not self.api_key:
            raise ProviderUnavailableError("Groq API key not configured")
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": kwargs.get("max_tokens", 1024),
                        "temperature": kwargs.get("temperature", 0.7),
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
                
        except Exception as e:
            logger.error(f"Groq error: {e}")
            raise ProviderUnavailableError(f"Groq failed: {e}")


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini provider.
    FREE TIER: 60 requests/minute, 1M tokens/day.
    Second fallback.
    """
    
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model = None
        if self.is_available():
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                logger.info("Gemini provider initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini: {e}")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    async def generate(self, prompt: str, **kwargs) -> str:
        if not self.model:
            raise ProviderUnavailableError("Gemini not configured")
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            raise ProviderUnavailableError(f"Gemini failed: {e}")


class OllamaProvider(BaseLLMProvider):
    """
    Ollama local provider.
    Completely FREE, runs locally.
    """
    
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self._available = False
        self._check_availability()
    
    def _check_availability(self):
        """Check if Ollama is actually running."""
        try:
            import httpx
            response = httpx.get(f"{self.base_url}/api/tags", timeout=2.0)
            self._available = response.status_code == 200
        except:
            self._available = False
    
    def is_available(self) -> bool:
        return self._available
    
    async def generate(self, prompt: str, **kwargs) -> str:
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["response"]
                
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise ProviderUnavailableError(f"Ollama failed: {e}")


class SimpleTemplateProvider(BaseLLMProvider):
    """
    Simple template-based provider.
    ULTIMATE FALLBACK - no external API needed.
    Uses templates and randomization for demo purposes.
    """
    
    CAPTION_TEMPLATES = [
        "✨ There's something magical about moments like these... {content} 🌟 What does this make you feel? Drop your thoughts below! 👇 #AestheticVibes #MoodBoard #Trending",
        "🌸 In a world of chaos, find your peace... {content} � Tag someone who needs to see this beauty 💕 #VibezOnly #BeautifulMoments #Aesthetic",
        "� Stop scrolling, you need to see this! {content} ✨ Double tap if this hits different � #InstaVibes #ContentCreator #Viral",
        "� Life is all about these little wonders... {content} 🌿 What's your favorite way to appreciate beauty? 💭 #SlowLiving #Mindful #NatureLovers",
        "⭐ Some things just speak to the soul... {content} 🎨 Save this for when you need a reminder ❤️ #DailyInspiration #AestheticFeed #ContentOS",
    ]
    
    SUMMARY_TEMPLATES = [
        "This content discusses {topic}. Key points include the main ideas presented.",
        "Summary: The content focuses on {topic} and provides valuable insights.",
        "In brief: {topic} is the central theme with important takeaways.",
    ]
    
    HASHTAGS = [
        "#ContentOS", "#AI", "#ContentCreation", "#Digital", "#Tech",
        "#Innovation", "#Creative", "#Trending", "#Viral", "#Social",
        "#Marketing", "#Growth", "#Engagement", "#Strategy", "#Success",
    ]
    
    def is_available(self) -> bool:
        return True  # Always available
    
    async def generate(self, prompt: str, **kwargs) -> str:
        prompt_lower = prompt.lower()
        
        # Detect task type from prompt
        if "caption" in prompt_lower:
            # Extract content from prompt
            content = self._extract_content(prompt)
            template = random.choice(self.CAPTION_TEMPLATES)
            return template.format(content=content[:100])
        
        elif "summary" in prompt_lower or "summarize" in prompt_lower:
            content = self._extract_content(prompt)
            topic = content[:50] + "..." if len(content) > 50 else content
            template = random.choice(self.SUMMARY_TEMPLATES)
            return template.format(topic=topic)
        
        elif "hashtag" in prompt_lower:
            count = 5
            # Try to extract count from prompt
            for word in prompt.split():
                if word.isdigit():
                    count = int(word)
                    break
            selected = random.sample(self.HASHTAGS, min(count, len(self.HASHTAGS)))
            return "\n".join(selected)
        
        elif "rewrite" in prompt_lower or "tone" in prompt_lower:
            content = self._extract_content(prompt)
            if "professional" in prompt_lower:
                return f"We are pleased to inform you that {content}"
            elif "casual" in prompt_lower:
                return f"Hey! Just wanted to share - {content} 😊"
            elif "engaging" in prompt_lower:
                return f"🔥 You won't believe this: {content}! 🚀"
            return content
        
        elif "moderation" in prompt_lower or "safety" in prompt_lower:
            # Return safe analysis
            return """SAFETY_SCORE: 85
FLAGS: none
EXPLANATION: Content appears to be safe for publication."""
        
        else:
            # Generic response
            return f"Generated response for: {prompt[:100]}..."
    
    def _extract_content(self, prompt: str) -> str:
        """Extract the main content from a prompt."""
        # Look for content after common markers
        markers = ["Content:", "content:", "Text:", "text:", "Original:"]
        for marker in markers:
            if marker in prompt:
                parts = prompt.split(marker)
                if len(parts) > 1:
                    # Get content until next section or end
                    content = parts[1].split("\n\n")[0].strip()
                    return content
        # Return last 200 chars if no marker found
        return prompt[-200:].strip()


# ===========================================
# Main LLM Service with Fallback Chain
# ===========================================

class LLMService:
    """
    LLM Service with automatic fallback chain.
    
    Priority: AWS Bedrock → Grok → Gemini → Ollama → Simple Templates
    """
    
    def __init__(self):
        self.providers: List[tuple[str, BaseLLMProvider]] = [
            (LLMProvider.AWS_BEDROCK, AWSBedrockProvider()),
            (LLMProvider.GROK, GrokProvider()),
            (LLMProvider.GEMINI, GeminiProvider()),
            (LLMProvider.OLLAMA, OllamaProvider()),
            (LLMProvider.SIMPLE, SimpleTemplateProvider()),  # Ultimate fallback
        ]
        
        # Log available providers
        available = [name for name, p in self.providers if p.is_available()]
        logger.info(f"LLM providers available: {available}")
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=10))
    async def generate(
        self,
        prompt: str,
        task: str = "general",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate text using the fallback chain.
        
        Args:
            prompt: The input prompt
            task: Task type for logging
            **kwargs: Additional parameters (max_tokens, temperature, etc.)
        
        Returns:
            Dict with 'text', 'provider', and 'fallback_used'
        """
        errors = []
        fallback_used = False
        
        for i, (name, provider) in enumerate(self.providers):
            if not provider.is_available():
                continue
            
            try:
                logger.info(f"Trying LLM provider: {name} for task: {task}")
                text = await provider.generate(prompt, **kwargs)
                
                return {
                    "text": text,
                    "provider": name,
                    "fallback_used": fallback_used,
                }
                
            except ProviderUnavailableError as e:
                errors.append(f"{name}: {e}")
                logger.warning(f"Provider {name} failed, trying next...")
                fallback_used = True
                continue
        
        # All providers failed (shouldn't happen with SimpleTemplateProvider)
        error_msg = "; ".join(errors)
        logger.error(f"All LLM providers failed: {error_msg}")
        raise AllProvidersFailedError(f"All providers failed: {error_msg}")
    
    async def generate_caption(self, content: str, content_type: str = "text") -> Dict[str, Any]:
        """Generate an aesthetic, engaging caption for content."""
        prompt = f"""You are a creative social media copywriter known for aesthetic, viral captions.

Create an AESTHETIC and ENGAGING caption for this {content_type} content.

Requirements:
- Length: 150-300 characters (not too short!)
- Start with a mood-setting line or poetic phrase
- Include 3-5 relevant emojis spread throughout (not all at the end)
- Add a thought-provoking question or call-to-action
- End with 3-5 trending hashtags
- Tone: Dreamy, aesthetic, and relatable

Content: {content}

Write the caption now (no explanations, just the caption):"""
        return await self.generate(prompt, task="caption")
    
    async def generate_summary(self, content: str) -> Dict[str, Any]:
        """Generate a summary of content."""
        prompt = f"""Summarize the following content in 2-3 concise sentences.
Focus on the key points and main message.

Content: {content}

Summary:"""
        return await self.generate(prompt, task="summary")
    
    async def generate_hashtags(self, content: str, count: int = 5) -> Dict[str, Any]:
        """Generate hashtags for content."""
        prompt = f"""Generate {count} relevant hashtags for the following content.
Return only the hashtags, each on a new line, starting with #.
Make them trending-friendly and discoverable.

Content: {content}

Hashtags:"""
        result = await self.generate(prompt, task="hashtags")
        
        # Parse hashtags from response
        lines = result["text"].strip().split("\n")
        hashtags = [line.strip() for line in lines if line.strip().startswith("#")]
        
        # If no hashtags parsed, create from content
        if not hashtags:
            words = content.split()[:count]
            hashtags = [f"#{word.strip('.,!?').capitalize()}" for word in words if len(word) > 3]
        
        return {
            **result,
            "hashtags": hashtags[:count]
        }


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
