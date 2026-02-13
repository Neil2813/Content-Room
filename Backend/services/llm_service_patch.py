async def generate_caption(
    self, 
    content: str, 
    content_type: str = "text",
    max_length: int = 280,
    platform: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a platform-optimized caption for content.
    
    Args:
        content: The content to generate a caption for
        content_type: Type of content (text, image, audio, video)
        max_length: Maximum caption length in characters
        platform: Target platform (twitter, instagram, linkedin, custom)
    """
    # Platform-specific tone customization
    if platform == "linkedin":
        tone_instructions = """- Tone: Professional, thought-leadership, industry-focused
- Style: Start with an insight or professional perspective
- Language: Clear, authoritative, and value-driven
- Emojis: Minimal (1-2 professional emojis like 💼 📊 🚀)
- Hashtags: Industry-relevant and professional (#Leadership #Innovation #Business)
- Call-to-action: Invite professional discussion or connection"""
    elif platform == "twitter" or platform == "x":
        tone_instructions = """- Tone: Knowledgeable, Reserved, and Insightful
- Style: Concise, intelligent, and thought-provoking
- Language: Sharp, clear, intellectual without being pretentious
- Emojis: Very minimal (0-1 thought

ful emoji)
- Hashtags: Trending topics and knowledge-based tags
- Call-to-action: Spark intelligent conversation or retweets"""
    elif platform == "instagram":
        tone_instructions = """- Tone: Aesthetic, Dreamy, and Visually Evocative
- Style: Start with a mood-setting line or poetic phrase
- Language: Emotional, relatable, and visually descriptive
- Emojis: 3-5 aesthetic emojis spread throughout (✨ 🌸 💫 🌙 🦋)
- Hashtags: Aesthetic and lifestyle tags (#AestheticVibes #InstaDaily #VisualMoodboard)
- Call-to-action: Engage emotions, tag friends, save for later"""
    else:
        # Default/Custom: balanced aesthetic approach
        tone_instructions = """- Tone: Engaging and relatable
- Style: Mix of aesthetic and informative
- Emojis: 2-4 relevant emojis
- Hashtags: Mix of trending and niche tags
- Call-to-action: Encourage engagement"""
    
    prompt = f"""You are an expert social media copywriter creating a caption for {platform or 'social media'}.

Create a compelling caption for this {content_type} content.

Requirements:
- Maximum length: {max_length} characters
{tone_instructions}
- IMPORTANT: Keep total length under {max_length} characters

Content: {content}

Write the caption now (no explanations, just the caption):"""
    return await self.generate(prompt, task="caption")
