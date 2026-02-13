# 🚀 ContentOS: AI-Powered Content Workflow Platform

<div align="center">

**The Complete AI Content Engine for Modern Creators**

[![Made for Bharat](https://img.shields.io/badge/Made%20for-Bharat%20🇮🇳-orange)](https://github.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*Create • Moderate • Translate • Schedule • Analyze*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**ContentOS** is a unified, AI-powered workspace designed for content creators, brands, marketers, and developers to streamline their entire content workflow. From raw media files to published social posts, ContentOS handles everything with cutting-edge AI.

### 🎯 Why ContentOS?

- **🚫 No More Copy-Paste Hell**: Upload media → Get captions instantly
- **🛡️ Explainable Moderation**: Know *why* content is flagged, not just *that* it's flagged
- **🌍 Built for India**: 10+ Indian languages with proper transcreation
- **📊 Data-Driven**: Real-time analytics for all your content operations
- **🔐 Privacy-First**: Your content, your data, your control

---

## ✨ Features

### 1. 🎨 Creator Studio (AI Content Generation)

Turn any media into platform-ready content in seconds.

#### **Media-Only Generation** ✨ NEW!
- 📸 **Upload & Analyze**: Drop an image, audio, or video file
- 🤖 **AI Extraction**: Automatically understands content (OCR, speech-to-text, scene detection)
- ✍️ **Smart Captions**: Generates platform-optimized captions without text input
- #️⃣ **Hashtag Magic**: AI suggests trending & relevant hashtags
- 🔄 **Zero Manual Work**: Perfect for visual creators and photographers

**Example Workflow:**
```
Upload sunset photo → AI detects "ocean, golden hour, beach" 
→ Instagram caption: "Golden hour magic ✨ #SunsetLovers #BeachVibes"
```

#### **Platform-Specific Tones**
Each platform has its own voice. ContentOS adapts automatically:

| Platform | Tone | Character Limit | Example |
|----------|------|-----------------|---------|
| **LinkedIn** 💼 | Professional, thought-leadership | 3000 chars | "Innovation happens when great minds collaborate..." |
| **Twitter/X** 🐦 | Knowledgeable, reserved, insightful | 280 chars | "The data speaks for itself. Thread below 🧵" |
| **Instagram** ✨ | Aesthetic, dreamy, emotion-focused | 2200 chars | "Where the earth touches the sky ✨🌄" |
| **Custom** 🎯 | Balanced, engaging | User-defined | Flexible for niche platforms |

#### **Multi-Language Translation**
Seamlessly translate content into **10+ Indian languages**:
- 🇮🇳 Hindi (हिंदी)
- 🇮🇳 Telugu (తెలుగు)
- 🇮🇳 Tamil (தமிழ்)
- 🇮🇳 Bengali (বাংলা)
- 🇮🇳 Kannada (ಕನ್ನಡ)
- 🇮🇳 Malayalam (മലയാളം)
- 🇮🇳 Gujarati (ગુજરાતી)
- 🇮🇳 Odia (ଓଡ଼ିଆ)
- 🇮🇳 Marathi (मराठी)
- 🇮🇳 Punjabi (ਪੰਜਾਬੀ)

**Features:**
- ✅ Context-aware transcreation (not literal translation)
- ✅ Preserves emojis and hashtags appropriately
- ✅ Supports Devanagari, Tamil, Telugu, and other scripts
- ✅ One-click translation for captions AND summaries

#### **Customization Controls**
Fine-tune your content generation:
- 📏 **Caption Length**: Slide from 100 to 3000 characters
- #️⃣ **Hashtag Count**: Choose 3-20 hashtags
- 🎯 **Platform Presets**: Auto-adjusts length for Twitter/Instagram/LinkedIn
- 🎭 **Tone Variations**: Professional, Casual, Funny, Engaging

---

### 2. 🛡️ Explainable AI Moderation

Move beyond cryptic safety scores. ContentOS explains *why* content is flagged.

#### **Multimodal Analysis**
- **Text**: Detects hate speech, profanity, sensitive topics
- **Images**: Computer vision for inappropriate visuals, violence, nudity
- **Audio**: Transcribes speech and analyzes for safety
- **Video**: Extracts frames + audio for comprehensive analysis

#### **Explainable Reports**
Instead of:
```
❌ Safety Score: 0.23 (Flagged)
```

You get:
```
🚨 FLAGGED
Reason: Content contains potentially harmful language in lines 3-5.
Specific Issues:
  - Line 3: "XYZ phrase" may violate platform policies
  - Recommendation: Rephrase or remove the flagged section
Severity: Medium
```

#### **Smart Decisions**
- ✅ **ALLOW**: Safe to publish
- ⚠️ **FLAG**: Review recommended before publishing
- ❌ **ESCALATE**: High-risk content, manual review required

#### **Privacy-Preserving**
- Run moderation locally (no data leaves your server)
- Or use secure enterprise APIs (AWS Rekognition, Gemini)
- Option to disable logging for sensitive content

---

### 3. 📅 Smart Scheduler

Plan, schedule, and publish content across all platforms.

#### **Cross-Platform Scheduling**
- **Twitter/X**: Threads, tweets, polls
- **LinkedIn**: Posts, articles, company updates
- **Instagram**: Feed posts, stories, reels

#### **Visual Calendar**
- 📆 **Month View**: See your entire content calendar
- 🎨 **Drag & Drop**: Move posts between days effortlessly
- 🔔 **Reminders**: Get notified before posts go live
- 📊 **Status Tracking**: Draft → Scheduled → Published

#### **Safety Integration**
- ✅ Auto-checks moderation status before scheduling
- ⚠️ Warns if content might violate platform policies
- 🔒 Prevents accidental publishing of flagged content

---

### 4. 📊 Analytics & History Dashboard

Track every piece of content you create.

#### **Unified Timeline**
View all your content activity in one place:
- 💬 Generated Captions
- 📝 Summaries
- #️⃣ Hashtags
- 🛡️ Moderation Results
- 📅 Scheduled Posts

#### **Real-Time Metrics**
- **Total Content Created**: Lifetime count
- **Moderation Safety Rate**: % of content flagged
- **Platform Distribution**: Where you post most
- **Language Breakdown**: Which languages you create in
- **Trends Over Time**: Charts showing your activity

#### **Filtering & Search**
- 🔍 Search by keyword or hashtag
- 📅 Filter by date range
- 🌐 Filter by platform (Twitter/Instagram/LinkedIn)
- 🔤 Filter by language

---

## 🛠️ Tech Stack

### Frontend Architecture

```
React 18 + TypeScript + Vite
├── UI Framework: Shadcn/UI + TailwindCSS
├── Icons: Lucide React
├── Charts: Recharts
├── Animations: Framer Motion
├── Routing: React Router v6
├── State Management: Context API + LocalStorage
└── Fonts: Anek (supports Indian languages)
```

**Key Libraries:**
- `react` v18.3
- `typescript` v5.5
- `tailwindcss` v3.4
- `vite` v5.4
- `shadcn/ui` (latest)

### Backend Architecture

```
FastAPI + Python 3.10
├── Database: SQLAlchemy (SQLite/PostgreSQL)
├── Authentication: JWT + Argon2
├── AI Orchestration:
│   ├── LLM: Groq (Llama 3.2) / Gemini 2.0 Flash / Grok
│   ├── Vision: AWS Rekognition / Gemini Vision
│   ├── Speech: OpenAI Whisper
│   └── Video: FFmpeg (frame extraction)
├── Social APIs:
│   ├── Twitter/X: Twikit (cookie-based)
│   ├── LinkedIn: OAuth 2.0
│   └── Instagram: OAuth 2.0
└── Utilities: Pydantic, python-multipart, aiofiles
```

**Key Dependencies:**
- `fastapi` v0.115
- `sqlalchemy` v2.0
- `groq` v0.13
- `google-generativeai` v0.8
- `boto3` (AWS SDK)
- `openai-whisper`
- `ffmpeg-python`

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** v18 or higher ([Download](https://nodejs.org/))
- ✅ **Python** v3.10 or higher ([Download](https://www.python.org/))
- ✅ **FFmpeg** installed ([Download](https://ffmpeg.org/download.html))
- ✅ **Git** installed
- ✅ API keys for at least one LLM provider (Groq/Gemini/Grok)

### Installation Steps

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/content-os.git
cd content-os
```

#### 2️⃣ Backend Setup

```bash
cd Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env and add your API keys (see Configuration section)

# Initialize database
# Database will auto-create on first run

# Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Backend running at: `http://localhost:8000`  
📚 API Documentation: `http://localhost:8000/docs`

#### 3️⃣ Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend running at: `http://localhost:5173`

---

## ⚙️ Configuration

### Backend Environment Variables (`Backend/.env`)

Create a `.env` file in the `Backend/` directory:

```env
# ========================================
# AI PROVIDERS (Required)
# ========================================
# Get your API keys from:
# - Groq: https://console.groq.com/keys
# - Gemini: https://makersuite.google.com/app/apikey
# - Grok: https://console.x.ai/

GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GROK_API_KEY=xai_your_grok_api_key_here  # Optional

# Primary LLM provider (options: groq, gemini, grok)
LLM_PROVIDER=groq

# ========================================
# AWS SERVICES (Optional - for image moderation)
# ========================================
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# ========================================
# SOCIAL MEDIA OAUTH (Optional)
# ========================================
# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_secret

# Instagram
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_secret

# ========================================
# DATABASE (Optional - defaults to SQLite)
# ========================================
DATABASE_URL=sqlite:///./contentos.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/contentos

# ========================================
# SECURITY
# ========================================
SECRET_KEY=your-super-secret-jwt-key-change-this
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ========================================
# RATE LIMITING
# ========================================
RATE_LIMIT_PER_MINUTE=60
```

### Getting API Keys

#### **Groq (Recommended - Free Tier Available)**
1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up / Sign in
3. Navigate to "API Keys"
4. Create new key → Copy to `.env`

#### **Google Gemini**
1. Visit [makersuite.google.com](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Get API Key"
4. Copy to `.env`

#### **AWS (for Image Moderation)**
1. Visit [AWS Console](https://aws.amazon.com/console/)
2. Create IAM user with Rekognition permissions
3. Generate Access Key & Secret
4. Add to `.env`

---

## 📸 Social Media Connection

### Twitter / X (Cookie-Based Auth)

Due to Cloudflare protections, we use **manual cookie import**:

1. **Install Cookie Export Extension**  
   - Chrome: [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
   - Firefox: [Cookie-Editor](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)

2. **Log in to X.com**  
   - Open [x.com](https://x.com) in your browser
   - Log in normally

3. **Export Cookies**  
   - Click the cookie extension icon
   - Click "Export" (copies JSON to clipboard)

4. **Import to ContentOS**  
   - Navigate to `Settings → Social Platforms → X (Twitter)`
   - Click "Connect via Cookies"
   - Paste the JSON
   - Click "Import & Connect"

✅ **Status will change to "Connected"** with your profile info!

### LinkedIn

1. Create LinkedIn App at [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Add callback URL: `http://localhost:8000/api/v1/social/linkedin/callback`
3. Copy Client ID & Secret to `.env`
4. In ContentOS: `Settings → LinkedIn → Connect`

### Instagram

1. Create Instagram App at [Meta for Developers](https://developers.facebook.com/)
2. Add callback URL: `http://localhost:8000/api/v1/social/instagram/callback`
3. Copy App ID & Secret to `.env`
4. In ContentOS: `Settings → Instagram → Connect`

---

## 📚 Documentation

### API Endpoints

#### **Authentication**

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/profile
POST /api/v1/auth/logout
```

#### **Content Creation**

```http
POST /api/v1/create/caption
  Body: { content, content_type, max_length, platform }

POST /api/v1/create/summary
  Body: { content, content_type, max_length }

POST /api/v1/create/hashtags
  Body: { content, content_type, count }

POST /api/v1/create/extract-and-generate
  Body: multipart/form-data (file upload)
```

#### **Translation**

```http
POST /api/v1/translate
  Body: { text, target_language }
```

#### **Moderation**

```http
POST /api/v1/moderate/text
POST /api/v1/moderate/image
POST /api/v1/moderate/video
```

#### **History & Analytics**

```http
GET /api/v1/history
GET /api/v1/history/stats
GET /api/v1/analytics/dashboard
```

Full API documentation available at: `http://localhost:8000/docs` (Swagger UI)

---

## 🎯 Use Cases

### For Content Creators 📱
- Upload daily photos → Get Instagram captions in seconds
- Record podcast clips → Auto-generate episode descriptions
- Translate content to reach regional audiences

### For Brands & Marketers 🎨
- Bulk process product images for e-commerce captions
- Moderate user-generated content before campaigns
- Schedule multi-platform content from one dashboard

### For Developers 🔧
- Integrate ContentOS APIs into existing tools
- Build custom AI workflows with our modular architecture
- Extend with new LLM providers or social platforms

---

## 🧪 Testing

### Run Backend Tests

```bash
cd Backend
pytest tests/ -v --cov=.
```

### Run Frontend Tests

```bash
cd Frontend
npm run test
```

### Manual Testing Checklist

- [ ] Register new user account
- [ ] Generate caption for text input
- [ ] Upload image → Analyze media → Generate caption
- [ ] Translate caption to Hindi
- [ ] Moderate a text sample
- [ ] View analytics dashboard
- [ ] Connect Twitter/LinkedIn account
- [ ] Schedule a post

---

## 🚧 Roadmap

### Q1 2026
- [x] Platform-specific caption tones
- [x] Media-only generation (no text required)
- [x] Multi-language translation (10+ Indian languages)
- [ ] Batch processing (upload 10+ images at once)
- [ ] A/B testing for caption variations

### Q2 2026
- [ ] Voice-to-post (record audio → auto-publish)
- [ ] Brand voice training (AI learns your style)
- [ ] Advanced analytics (engagement predictions)
- [ ] Mobile app (React Native)

### Q3 2026
- [ ] Team collaboration features
- [ ] Content calendar templates
- [ ] Integration with Canva/Figma
- [ ] WhatsApp Business API integration

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**  
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**  
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to branch**  
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- ✅ Follow existing code style (ESLint + Black formatter)
- ✅ Add tests for new features
- ✅ Update documentation for API changes
- ✅ Use meaningful commit messages
- ✅ One feature per PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: `ModuleNotFoundError: No module named 'groq'`  
**Fix**: Activate venv and run `pip install -r requirements.txt`

**Issue**: `CORS error` when frontend calls backend  
**Fix**: Ensure backend is running on `http://localhost:8000` (not 127.0.0.1)

**Issue**: Media upload fails with "File too large"  
**Fix**: Check file size limits in `Backend/main.py` (default: 20MB for video)

**Issue**: Twitter connection shows "Cloudflare error"  
**Fix**: Use manual cookie import method (see [Social Media Connection](#-social-media-connection))

**Issue**: Gemini API returns `429 Too Many Requests`  
**Fix**: Switch to Groq or add rate limiting delays

For more help, open an issue on [GitHub Issues](https://github.com/your-username/content-os/issues).

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 ContentOS Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

---

## 🌟 Acknowledgments

- **Google Gemini** for powerful vision and language models
- **Groq** for lightning-fast LLM inference
- **AWS Rekognition** for image moderation
- **OpenAI Whisper** for speech recognition
- **Shadcn/UI** for beautiful React components
- **FastAPI** for the elegant Python framework

---

## 📞 Support & Contact

- 📧 **Email**: support@contentos.dev
- 🐦 **Twitter**: [@ContentOS](https://twitter.com/contentos)
- 💬 **Discord**: [Join Community](https://discord.gg/contentos)
- 📖 **Docs**: [docs.contentos.dev](https://docs.contentos.dev)

---

## ⭐ Star History

If you find ContentOS useful, please give it a star! ⭐

It helps others discover the project and motivates us to keep improving.



**Built with ❤️ for the Global Creator Economy**

*Powered by AI • Made for India 🇮🇳 • Open to the World 🌍*

[⬆ Back to Top](#-contentos-ai-powered-content-workflow-platform)

</div>
