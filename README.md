## ContentOS – AI Content Workflow Engine

**ContentOS** is an **AWS‑native, multilingual AI Content OS** that helps you **create, moderate, translate, schedule, and analyze** digital content. It acts as the intelligence layer for any platform, with every AWS feature backed by a **local/GitHub free fallback** so you can run it even without cloud access.

For the full technical implementation notes and roadmap, see `CLAUDE.md`.

---

## Features

- **AI Content Studio**: Caption, summary, hashtag generation and rewrites for social content.
- **Multimodal Moderation**: Text, image, audio, and multimodal safety checks with a 3‑tier pipeline (edge prefilter → deep analysis → decision engine).
- **Multilingual Translation**: 9+ Indian languages (te, ta, hi, bn, kn, ml, gu, or, en) with automatic language detection.
- **Scheduling & Distribution**: Queue and manage scheduled posts for multiple platforms.
- **Analytics Dashboard**: Moderation stats, provider health, and content performance metrics.
- **Social Platform Integrations**: Twitter (X), Instagram, LinkedIn (and extendable to others).
- **Security & Governance**: Argon2 password hashing, JWT auth, rate limiting, and normalized safety scores.

---

## Tech Stack

- **Frontend**: Vite, React 18, TypeScript, TailwindCSS, shadcn/ui, React Query, Context API.
- **Backend**: FastAPI (Python), async SQLAlchemy + SQLite, Pydantic settings.
- **AI Services**:
  - **LLM**: AWS Bedrock → Grok → Gemini → local Ollama (fallback chain).
  - **Vision**: AWS Rekognition → Google Vision → OpenCV (local).
  - **Speech**: AWS Transcribe → Google Speech → Whisper (local).
  - **Translation**: AWS Translate → Google Translate (deep‑translator) → IndicTrans/local.

---

## Project Structure

At a high level:

```text
d:\Content Room\
├── Frontend/        # Vite + React app (Studio, Moderation, Scheduler, Analytics, etc.)
└── Backend/         # FastAPI backend (auth, creation, moderation, translation, scheduling, analytics)
```

See `CLAUDE.md` for a more detailed, file‑level breakdown.

---

## Prerequisites

- **OS**: Windows 10+ (dev setup tested).
- **Backend**:
  - Python 3.10+ (recommended 64‑bit).
  - `pip` and virtualenv (or any env manager).
- **Frontend**:
  - Node.js 18+ and npm (or pnpm/yarn).
- **Optional Cloud Keys** (for full power; local fallbacks can be used without them):
  - AWS credentials (Bedrock, Rekognition, Transcribe, Translate).
  - Groq API key.
  - Gemini API key.
  - Social platform credentials (Twitter/X, LinkedIn, Facebook/Instagram).

---

## Backend – Local Setup

From `d:\Content Room\Backend`:

1. **Create & activate a virtual environment (PowerShell example)**:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Install dependencies**:

   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:

   - Copy `.env.example` to `.env` (if present) or create `.env`.
   - Set at least:
     - **JWT secret key**
     - Database path (if you don’t want the default SQLite file).
     - Any AI provider keys you intend to use.

4. **Run the FastAPI server** (usually on port 8000):

   ```powershell
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   After it starts, the interactive docs are typically available at `http://localhost:8000/docs`.

---

## Frontend – Local Setup

From `d:\Content Room\Frontend`:

1. **Install dependencies**:

   ```powershell
   npm install
   ```

2. **Configure frontend environment**:

   - Create a `.env` or `.env.local` file as required by the Vite setup (for example, `VITE_API_BASE_URL=http://localhost:8000`).
   - Make sure the base URL matches where your FastAPI backend is running.

3. **Run the dev server**:

   ```powershell
   npm run dev
   ```

4. **Open the app**:

   - Visit the URL printed by Vite (commonly `http://localhost:5173`).
   - Log in or register via the auth screens; the app will then connect to the backend APIs.

---

## Key Capabilities by Area

- **Auth**: Register, login, `me`, logout with JWT and Argon2‑hashed passwords.
- **Creation**: Caption, summary, hashtag generation, and rewrites via the LLM fallback chain.
- **Moderation**:
  - Tier 1: Fast keyword + color heuristics.
  - Tier 2: Deep analysis via Comprehend/Rekognition + LLM, Whisper transcription.
  - Tier 3: Decision engine returning **ALLOW / FLAG / ESCALATE** and a normalized safety score (0–100).
- **Translation**: Single text, batch translation, language detection, and a language list endpoint.
- **Scheduling**: CRUD for scheduled posts with a distribution queue.
- **Analytics**: Dashboard metrics, moderation statistics, and provider status endpoints.

---

## Security Notes

- **Passwords** are stored using **Argon2**.
- **Authentication** uses **JWT** with expiration.
- **Rate limiting** is enforced via a token bucket middleware.
- **CORS** is locked down in production and open only in debug/dev.
- **Secrets**: Never commit real secrets. Use `.env` and keep `.env.example` as your public template.

Before deploying to production, make sure to:

- **Change all default secrets**.
- **Restrict CORS origins**.
- **Review configured AI providers and quotas**.

---

## Contributing / Extending

- New AI providers can be added by extending the provider chain in `services/llm_service.py` and related services.
- Additional social platforms can be wired through the scheduler and social integration layer.
- More details and future enhancement ideas (video processing, Redis cache, ML‑based engagement prediction, multi‑tenant support, etc.) are documented in `CLAUDE.md`.

---

## One‑Line Pitch

**“An AWS‑native, multilingual AI Content OS that creates, moderates, and distributes digital content safely and intelligently — acting as the intelligence layer for any platform.”**

# ContentOS

**AI-Powered Content Workflow Engine**

An AWS-native, multilingual AI platform that creates, moderates, and distributes digital content safely and intelligently — acting as the intelligence layer for any platform.

---

## Features

### Content Creation
- **AI Captions** — Generate engaging social media captions
- **Smart Summaries** — Summarize long-form content
- **Hashtag Generation** — Context-aware hashtag suggestions
- **Content Rewriting** — Rewrite text for different tones/platforms

### Multimodal Moderation
- **3-Tier Architecture** — Edge prefilter → Deep analysis → Decision engine
- **Text Moderation** — Toxicity, sentiment, and PII detection
- **Image Moderation** — NSFW, violence, and unsafe content detection
- **Audio Moderation** — Transcription + content analysis
- **Multimodal Analysis** — Combined analysis for mixed media

### Translation
- **9+ Indian Languages** — Telugu, Tamil, Hindi, Bangla, Kannada, Malayalam, Gujarati, Odia, English
- **Auto Language Detection** — Identify source language automatically
- **Batch Translation** — Translate multiple texts at once

### Distribution
- **Post Scheduling** — Schedule content for optimal times
- **Multi-Platform Publishing** — Twitter, Instagram, LinkedIn integration
- **Analytics Dashboard** — Real-time performance metrics

---

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui
- React Query for state management

### Backend
- FastAPI (Python 3.11+)
- SQLite with async SQLAlchemy
- JWT authentication with Argon2 hashing

### AI Services (with Fallbacks)

| Service | AWS Primary | Free Fallback |
|---------|-------------|---------------|
| LLM | Bedrock (Claude) | Grok → Gemini → Ollama |
| Vision | Rekognition | OpenCV (local) |
| Speech | Transcribe | Whisper (local) |
| Translation | Translate | deep-translator (Google) |
| Moderation | Comprehend | LLM fallback |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) AWS credentials for primary services

### Backend Setup

```bash
cd Backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your API keys

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:8000`.

---

## Configuration

Create a `.env` file in the Backend directory:

```env
# Security (CHANGE IN PRODUCTION)
SECRET_KEY=your-secret-key-change-in-production
DEBUG=true

# AWS Credentials (Optional - enables primary services)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# LLM Fallbacks (Free tiers available)
GROQ_API_KEY=           # https://console.groq.com/
GEMINI_API_KEY=         # https://makersuite.google.com/

# Social Media (Optional)
TWITTER_USERNAME=
TWITTER_PASSWORD=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get JWT |
| GET | `/api/v1/auth/me` | Get current user |

### Content Creation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/create/caption` | Generate caption |
| POST | `/api/v1/create/summary` | Generate summary |
| POST | `/api/v1/create/hashtags` | Generate hashtags |
| POST | `/api/v1/create/rewrite` | Rewrite content |

### Moderation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/moderate/text` | Moderate text |
| POST | `/api/v1/moderate/image` | Moderate image |
| POST | `/api/v1/moderate/audio` | Moderate audio |
| POST | `/api/v1/moderate/multimodal` | Combined moderation |

### Translation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/translate/text` | Translate text |
| POST | `/api/v1/translate/detect` | Detect language |
| GET | `/api/v1/translate/languages` | List languages |
| POST | `/api/v1/translate/batch` | Batch translate |

### Scheduling
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/schedule/` | Create scheduled post |
| GET | `/api/v1/schedule/` | List scheduled posts |
| DELETE | `/api/v1/schedule/{id}` | Cancel post |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/dashboard` | Dashboard metrics |
| GET | `/api/v1/analytics/moderation` | Moderation stats |
| GET | `/api/v1/analytics/providers` | Provider status |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│   Dashboard → Studio → Moderation → Scheduler → Analytics   │
└─────────────────────────────────────────────────────────────┘
                              ↓ API
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Creation │ │Moderation│ │Translation│ │ Schedule │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              ↓ Fallback Chain
┌─────────────────────────────────────────────────────────────┐
│                    AI/ML SERVICES                           │
│  LLM: AWS Bedrock → Grok → Gemini → Ollama                 │
│  Vision: AWS Rekognition → OpenCV                          │
│  Speech: AWS Transcribe → Whisper                          │
│  Translation: AWS Translate → Google Free                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Content Room/
├── Frontend/
│   └── src/
│       ├── pages/          # React pages
│       ├── components/     # UI components
│       ├── contexts/       # Auth & Language contexts
│       └── services/       # API client
│
├── Backend/
│   ├── main.py             # FastAPI entry
│   ├── database.py         # SQLite setup
│   ├── config/             # Settings
│   ├── models/             # Database models
│   ├── routers/            # API routes
│   ├── services/           # AI services
│   ├── middleware/         # Rate limiting
│   └── utils/              # Helpers
│
└── README.md
```

---

## Security

- **Argon2** password hashing (PHC winner)
- **JWT** authentication with expiry
- **Rate limiting** (60 req/min default)
- **CORS** whitelist in production
- **Parameterized queries** via SQLAlchemy ORM

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

<p align="center">
  Built with ❤️ for content creators
</p>
