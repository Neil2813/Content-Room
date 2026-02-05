# ContentOS API Test Guide

Complete test cases for all API endpoints with curl commands.

**Base URL:** `http://127.0.0.1:8000`

---

## 🔐 Authentication

### 1. Register New User

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Neil Emmanuel",
    "email": "neil@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Neil Emmanuel",
    "email": "neil@example.com",
    "is_active": true,
    "preferred_language": "en",
    "created_at": "2026-02-02T16:00:00"
  }
}
```

### 2. Login

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=neil@example.com&password=password123"
```

### 3. Get Profile (requires token)

```bash
curl -X GET http://127.0.0.1:8000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Logout

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/logout
```

---

## ✍️ Content Creation (No Auth Required)

### 1. Generate Caption

```bash
curl -X POST http://127.0.0.1:8000/api/v1/create/caption \
  -H "Content-Type: application/json" \
  -d '{
    "content": "A beautiful sunset over the mountains with golden rays piercing through the clouds",
    "content_type": "image",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "result": "🌅 When nature paints the sky... #GoldenHour #MountainMagic",
  "provider": "gemini",
  "fallback_used": true
}
```

### 2. Generate Summary

```bash
curl -X POST http://127.0.0.1:8000/api/v1/create/summary \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Artificial Intelligence has revolutionized the way we interact with technology. From voice assistants to autonomous vehicles, AI is transforming every industry. Machine learning algorithms can now process vast amounts of data to identify patterns and make predictions with remarkable accuracy. Healthcare is seeing breakthroughs in disease diagnosis, while finance uses AI for fraud detection and algorithmic trading.",
    "content_type": "text",
    "language": "en"
  }'
```

### 3. Generate Hashtags

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/create/hashtags?count=7" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Just launched my new tech startup focusing on sustainable energy solutions",
    "content_type": "text",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "hashtags": ["#StartupLife", "#CleanEnergy", "#Sustainability", "#TechForGood", "#GreenTech", "#Innovation", "#Entrepreneurship"],
  "provider": "gemini"
}
```

### 4. Rewrite with Tone

```bash
curl -X POST http://127.0.0.1:8000/api/v1/create/rewrite \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "content=The product is okay I guess. It works most of the time.&tone=professional"
```

**Try different tones:**
- `professional` - Formal business language
- `casual` - Friendly, conversational
- `engaging` - Exciting, attention-grabbing

---

## 🛡️ Moderation (No Auth Required)

### 1. Moderate Text

```bash
curl -X POST http://127.0.0.1:8000/api/v1/moderate/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a friendly message about helping others in the community.",
    "language": "en"
  }'
```

**Expected Response (Safe Content):**
```json
{
  "decision": "ALLOW",
  "safety_score": 95.0,
  "confidence": 0.9,
  "explanation": "Content analyzed with 0 flags detected",
  "flags": [],
  "provider": "llm_fallback",
  "processing_time_ms": 150
}
```

### 2. Moderate Text (Potentially Unsafe)

```bash
curl -X POST http://127.0.0.1:8000/api/v1/moderate/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I absolutely hate this and want to destroy everything",
    "language": "en"
  }'
```

**Expected Response (Flagged):**
```json
{
  "decision": "FLAG",
  "safety_score": 45.0,
  "confidence": 0.85,
  "explanation": "Potentially harmful language detected",
  "flags": ["hate", "violence"],
  "provider": "llm_fallback",
  "processing_time_ms": 200
}
```

### 3. Moderate Image

```bash
curl -X POST http://127.0.0.1:8000/api/v1/moderate/image \
  -F "image=@path/to/your/image.jpg"
```

### 4. Moderate Audio

```bash
curl -X POST http://127.0.0.1:8000/api/v1/moderate/audio \
  -F "audio=@path/to/your/audio.mp3"
```

### 5. Multimodal Moderation

```bash
curl -X POST http://127.0.0.1:8000/api/v1/moderate/multimodal \
  -F "text=Check this content" \
  -F "image=@path/to/image.jpg"
```

---

## 🌐 Translation (No Auth Required)

### 1. Translate Text

```bash
curl -X POST http://127.0.0.1:8000/api/v1/translate/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you today?",
    "target_lang": "hi"
  }'
```

**Expected Response:**
```json
{
  "translated_text": "नमस्ते, आज आप कैसे हैं?",
  "source_lang": "en",
  "target_lang": "hi",
  "provider": "google_free",
  "fallback_used": true
}
```

### 2. Translate to Different Indian Languages

**Hindi:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/translate/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Welcome to our platform", "target_lang": "hi"}'
```

**Telugu:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/translate/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Welcome to our platform", "target_lang": "te"}'
```

**Tamil:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/translate/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Welcome to our platform", "target_lang": "ta"}'
```

**Bengali:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/translate/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Welcome to our platform", "target_lang": "bn"}'
```

### 3. Detect Language

```bash
curl -X POST http://127.0.0.1:8000/api/v1/translate/detect \
  -H "Content-Type: application/json" \
  -d '{
    "text": "నమస్కారం, మీరు ఎలా ఉన్నారు?"
  }'
```

**Expected Response:**
```json
{
  "detected_language": "te",
  "confidence": 0.9
}
```

### 4. Get Supported Languages

```bash
curl -X GET http://127.0.0.1:8000/api/v1/translate/languages
```

**Expected Response:**
```json
[
  {"code": "en", "name": "English", "native": "English", "font": "Inter"},
  {"code": "hi", "name": "Hindi", "native": "हिंदी", "font": "Noto Sans Devanagari"},
  {"code": "te", "name": "Telugu", "native": "తెలుగు", "font": "Noto Sans Telugu"},
  {"code": "ta", "name": "Tamil", "native": "தமிழ்", "font": "Noto Sans Tamil"},
  {"code": "bn", "name": "Bengali", "native": "বাংলা", "font": "Noto Sans Bengali"},
  {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ", "font": "Noto Sans Kannada"},
  {"code": "ml", "name": "Malayalam", "native": "മലയാളം", "font": "Noto Sans Malayalam"},
  {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી", "font": "Noto Sans Gujarati"},
  {"code": "or", "name": "Odia", "native": "ଓଡ଼ିଆ", "font": "Noto Sans Oriya"}
]
```

### 5. Batch Translation

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/translate/batch?target_lang=hi" \
  -H "Content-Type: application/json" \
  -d '["Hello", "Good morning", "Thank you", "Goodbye"]'
```

---

## 📅 Scheduling (No Auth Required)

### 1. Create Scheduled Post

```bash
curl -X POST http://127.0.0.1:8000/api/v1/schedule/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product Launch Announcement",
    "description": "Exciting new features coming to ContentOS!",
    "scheduled_at": "2026-02-03T10:00:00",
    "platform": "twitter",
    "user_id": 1
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "title": "Product Launch Announcement",
  "description": "Exciting new features coming to ContentOS!",
  "scheduled_at": "2026-02-03T10:00:00",
  "status": "queued",
  "ai_optimized": false,
  "created_at": "2026-02-02T16:00:00"
}
```

### 2. List Scheduled Posts

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/schedule/?user_id=1"
```

### 3. Get Single Post

```bash
curl -X GET http://127.0.0.1:8000/api/v1/schedule/1
```

### 4. Cancel Post

```bash
curl -X DELETE http://127.0.0.1:8000/api/v1/schedule/1
```

---

## 📊 Analytics (No Auth Required)

### 1. Dashboard Metrics

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/dashboard?user_id=1"
```

**Expected Response:**
```json
{
  "total_content": 50,
  "content_this_week": 12,
  "moderation_safe": 45,
  "moderation_flagged": 5,
  "scheduled_posts": 3,
  "published_posts": 20
}
```

### 2. Moderation Stats

```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analytics/moderation?user_id=1"
```

**Expected Response:**
```json
{
  "total_moderated": 100,
  "safe_count": 85,
  "warning_count": 10,
  "unsafe_count": 3,
  "escalated_count": 2,
  "average_safety_score": 78.5
}
```

### 3. Provider Status

```bash
curl -X GET http://127.0.0.1:8000/api/v1/analytics/providers
```

**Expected Response:**
```json
{
  "current_providers": {
    "llm": "gemini",
    "vision": "opencv",
    "speech": "whisper",
    "translation": "google_free"
  },
  "aws_configured": false,
  "fallback_chain": {
    "llm": ["aws_bedrock", "grok", "gemini", "ollama"],
    "vision": ["aws_rekognition", "opencv"],
    "speech": ["aws_transcribe", "whisper"],
    "translation": ["aws_translate", "google_free"]
  }
}
```

---

## 🔧 System Endpoints

### Health Check

```bash
curl http://127.0.0.1:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "aws_configured": false,
  "llm_provider": "gemini"
}
```

### Root

```bash
curl http://127.0.0.1:8000/
```

---

## 🧪 Quick Test Script (PowerShell)

```powershell
# Test all endpoints quickly
$base = "http://127.0.0.1:8000"

# Health
Invoke-RestMethod "$base/health"

# Register
$body = @{name="Test"; email="test@test.com"; password="password123"} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$base/api/v1/auth/register" -Body $body -ContentType "application/json"

# Caption
$body = @{content="Beautiful sunset photo"; content_type="image"} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$base/api/v1/create/caption" -Body $body -ContentType "application/json"

# Moderation
$body = @{text="Hello friend!"} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$base/api/v1/moderate/text" -Body $body -ContentType "application/json"

# Translation
$body = @{text="Hello"; target_lang="hi"} | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "$base/api/v1/translate/text" -Body $body -ContentType "application/json"

# Analytics
Invoke-RestMethod "$base/api/v1/analytics/providers"
```

---

## 📝 Sample Content for Testing

### For Caption Generation
```
1. "A stunning photo of Eiffel Tower at night with city lights"
2. "Delicious homemade biryani with raita and mirchi"
3. "Team celebrating product launch milestone"
4. "Morning yoga session on the beach"
5. "New electric vehicle charging at home station"
```

### For Moderation (Safe)
```
1. "Thank you for your amazing support!"
2. "Looking forward to our collaboration"
3. "Great work team, let's keep it up!"
```

### For Moderation (To Flag)
```
1. "This product is terrible and I hate the company"
2. "The violence in this game is extreme"
```

### For Translation
```
English: "Welcome to ContentOS - Your AI Content Workflow Engine"
Hindi: "ContentOS में आपका स्वागत है - आपका AI कंटेंट वर्कफ़्लो इंजन"
Telugu: "ContentOS కు స్వాగతం - మీ AI కంటెంట్ వర్క్‌ఫ్లో ఇంజిన్"
```

---

## 🔗 Swagger UI

For interactive testing, open: **http://127.0.0.1:8000/docs**

All endpoints can be tested directly from the Swagger UI without writing curl commands.
