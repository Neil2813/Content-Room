# Content Room Backend

**AWS-native AI Content Workflow Engine** with resilient fallback architecture.

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com)
[![AWS](https://img.shields.io/badge/AWS-primary-orange.svg)](https://aws.amazon.com)
[![Status](https://img.shields.io/badge/Status-Complete-success.svg)]()

## ✅ Implementation Status

| Feature | Status | Description |
|---------|--------|-------------|
| Backend Foundation | ✅ Complete | FastAPI, SQLite, Argon2 auth |
| LLM Fallback Chain | ✅ Complete | Bedrock → Grok → Gemini → Ollama |
| Vision Service | ✅ Complete | Rekognition → OpenCV |
| Speech Service | ✅ Complete | Transcribe → Whisper |
| Translation Service | ✅ Complete | Translate → Google Free |
| Moderation Pipeline | ✅ Complete | 3-tier architecture |
| Storage Service | ✅ Complete | S3 → Firebase → Local |
| Task Scheduler | ✅ Complete | Background jobs + Social Queue |
| Social Integration | ✅ Complete | Twitter (Twikit), Instagram, LinkedIn |
| Frontend Integration | ✅ Complete | API client + page connections |
| Security Hardening | ✅ Complete | Rate limiting, CORS, secrets management |


## 🚀 Quick Start

```bash
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1    # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env with your API keys (AWS, Grok, Gemini)

# Run server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**API Docs:** http://localhost:8000/docs

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Content Room API Gateway (Port 8000)           │
├─────────────────────────────────────────────────────────────┤
│  Routers                                                    │
│  ├── /api/v1/auth/*        → Authentication (JWT + Argon2) │
│  ├── /api/v1/create/*      → Content Generation (LLM)      │
│  ├── /api/v1/moderate/*    → Multimodal Moderation         │
│  ├── /api/v1/translate/*   → 9 Indian Languages + English  │
│  ├── /api/v1/schedule/*    → Distribution Queue            │
│  └── /api/v1/analytics/*   → Performance Metrics           │
├─────────────────────────────────────────────────────────────┤
│  Services (AWS-first + Free Fallbacks)                      │
│  ├── llm_service        Bedrock → Grok → Gemini → Ollama   │
│  ├── vision_service     Rekognition → OpenCV               │
│  ├── speech_service     Transcribe → Whisper               │
│  ├── translation_service Translate → Google (free)         │
│  └── moderation_service Comprehend → LLM                   │
├─────────────────────────────────────────────────────────────┤
│  Database: SQLite (aiosqlite) - Zero cost                   │
│  Auth: JWT + Argon2 (PHC winner)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fallback Strategy

Every AWS service has a **free fallback** for reliability:

| Service | AWS Primary | Free Fallback | Offline Fallback |
|---------|-------------|---------------|------------------|
| **LLM** | Bedrock (Claude/Titan) | Grok → Gemini | Ollama (local) |
| **Vision** | Rekognition | - | OpenCV (local) |
| **Speech** | Transcribe | Google Speech | Whisper (local) |
| **Translation** | Translate | Google Translate | - |
| **Toxicity** | Comprehend | - | LLM fallback |

---

## 📁 Project Structure

```
Backend/
├── main.py                 # FastAPI entry point
├── database.py             # Async SQLite with SQLAlchemy
├── requirements.txt        # Dependencies
├── .env.example            # Environment template
│
├── config/
│   └── settings.py         # Pydantic settings with fallback detection
│
├── models/
│   ├── user.py             # User model (Argon2 password)
│   ├── content.py          # Content + moderation results
│   └── schedule.py         # Scheduled posts
│
├── routers/
│   ├── auth.py             # Register, login, profile
│   ├── creation.py         # Caption, summary, hashtags
│   ├── moderation.py       # Text, image, audio, multimodal
│   ├── translation.py      # Translate, detect, languages
│   ├── scheduler.py        # CRUD for scheduled posts
│   └── analytics.py        # Dashboard metrics
│
├── services/
│   ├── llm_service.py      # LLM fallback chain
│   ├── vision_service.py   # Image analysis
│   ├── speech_service.py   # Audio transcription
│   ├── translation_service.py  # Multilingual support
│   └── moderation_service.py   # 3-tier moderation
│
└── utils/
    └── logging.py          # Structured logging
```

---

## 🔧 Environment Variables

```bash
# AWS (PRIMARY)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# AWS Service Toggles
USE_AWS_BEDROCK=true
USE_AWS_REKOGNITION=true
USE_AWS_TRANSCRIBE=true
USE_AWS_TRANSLATE=true
USE_AWS_COMPREHEND=true

# LLM Fallbacks
GROK_API_KEY=          # https://console.x.ai/
GEMINI_API_KEY=        # https://makersuite.google.com/app/apikey
OLLAMA_BASE_URL=http://localhost:11434

# Database
DATABASE_URL=sqlite+aiosqlite:///./content_room.db

# Security
SECRET_KEY=your-secret-key
```

---

## 🛡️ Moderation Pipeline

**3-Tier Architecture** (inspired by Multil-Modal-Moderation-Pipeline):

```
┌─────────────────────────────────────────────────────┐
│ Tier 1: Edge Prefilter (<100ms)                     │
│   - Keyword detection                               │
│   - Color space analysis (skin tone, blood colors)  │
│   - Fast reject for obvious violations              │
├─────────────────────────────────────────────────────┤
│ Tier 2: Deep Analysis (1-8s)                        │
│   - AWS Comprehend (toxicity detection)             │
│   - AWS Rekognition (moderation labels)             │
│   - LLM reasoning (context understanding)           │
│   - Whisper transcription (for audio/video)         │
├─────────────────────────────────────────────────────┤
│ Tier 3: Decision Engine                             │
│   - Safety score 0-100                              │
│   - Decision: ALLOW / FLAG / ESCALATE               │
│   - Critical flags auto-escalate                    │
└─────────────────────────────────────────────────────┘
```

---

## 📝 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create new user |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET | `/api/v1/auth/me` | Current user profile |
| POST | `/api/v1/auth/logout` | Logout (client-side) |

### Content Creation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/create/caption` | Generate caption |
| POST | `/api/v1/create/summary` | Generate summary |
| POST | `/api/v1/create/hashtags` | Generate hashtags |
| POST | `/api/v1/create/rewrite` | Rewrite with tone |

### Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/moderate/text` | Moderate text |
| POST | `/api/v1/moderate/image` | Moderate image |
| POST | `/api/v1/moderate/audio` | Moderate audio |
| POST | `/api/v1/moderate/multimodal` | Combined analysis |

### Translation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/translate/text` | Translate text |
| POST | `/api/v1/translate/detect` | Detect language |
| GET | `/api/v1/translate/languages` | Supported languages |

---

## 🌐 Supported Languages

| Code | Language | Native |
|------|----------|--------|
| en | English | English |
| hi | Hindi | हिंदी |
| te | Telugu | తెలుగు |
| ta | Tamil | தமிழ் |
| bn | Bengali | বাংলা |
| kn | Kannada | ಕನ್ನಡ |
| ml | Malayalam | മലയാളം |
| gu | Gujarati | ગુજરાતી |
| or | Odia | ଓଡ଼ିଆ |

---

## 🧪 Testing

```bash
# Run tests
pytest

# Test health endpoint
curl http://localhost:8000/health

# Test auth registration
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@example.com", "password": "password123"}'
```

---

## 📄 License

MIT License - Built for AWS Hackathon
