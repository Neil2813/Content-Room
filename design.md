# Design Document - Content Room 🎨

## 1. System Architecture
Content Room follows a classic **Frontend-Backend-Service** architecture with external AI integrations.

### 1.1 High-Level Overview
- **Frontend**: A modern React SPA (Single Page Application) that communicates with the backend via REST APIs.
- **Backend**: A high-performance FastAPI server handling business logic, authentication, and service orchestration.
- **Service Layer**: Decouples API endpoints from business logic and external integrations (AWS/OpenAI).
- **External AI Infrastructure**: Leverages AWS (Bedrock, Rekognition, Transcribe) and OpenAI as the intelligence core.

## 2. Frontend Design

### 2.1 Tech Stack
- **Framework**: React 18 with TypeScript.
- **Build Tool**: Vite.
- **Styling**: TailwindCSS for layout and custom CSS for premium aesthetics.
- **Components**: shadcn/ui (Radix UI primitives).
- **Icons**: Lucide React.
- **State Management**: React Context (Auth, Theme) and React Query (Server state).

### 2.2 UI Organization
- **Public Routes**: Landing Page, Creator Studio (basic), Competitor Intel, Content Calendar.
- **Private Routes**: Schedule Plan, Profile Settings, Saved Content, Social Connections.

## 3. Backend Design

### 3.1 Tech Stack
- **Framework**: FastAPI (Asynchronous Python).
- **ORM**: SQLAlchemy with `asyncio` support.
- **Validation**: Pydantic v2.
- **Security**: JWT (Jose), Argon2 (Passlib).

### 3.2 Database Schema (Conceptual)
- **Users**: Local credentials, profile info.
- **SocialAccounts**: Platform type (Twitter/LinkedIn), access tokens/cookies.
- **ContentHistory**: Generated captions, hashtags, and moderation logs.
- **ScheduledPosts**: Media references, platform targets, scheduled timestamps, and status.

### 3.3 API Architecture
- `/api/v1/auth`: Registration, Login, User state.
- `/api/v1/create`: Generation endpoints (orchestrates Bedrock, Groq, Gemini fallbacks).
- `/api/v1/moderate`: Safety audit endpoints (orchestrates AWS Rekognition, Comprehend, and local fallbacks).
- `/api/v1/competitor`: Scraper and analyzer logic.
- `/api/v1/calendar`: Logic for merging niche data with Indian cultural events.
- `/api/v1/schedule`: CRON/Task management for automated posting.

## 4. AI & Integration Design

### 4.1 AI Provider Fallback Chains
Content Room implements a multi-tier fallback architecture to ensure high availability and cost-efficiency.

#### 4.1.1 Text Generation (LLM)
Priority-based chain for all content creation tasks:
1.  **AWS Bedrock**: Primary (Claude-3 / Llama-3).
2.  **Groq API**: First fallback (Llama-3.1 70B) for high-speed inference.
3.  **Google Gemini**: Second fallback (1.5 Flash) utilizing the free tier.
4.  **Ollama**: Third fallback for local/offline environments.
5.  **Simple Templates**: Ultimate fallback using pattern-based generation.

#### 4.1.2 Content Moderation
Tiered approach based on media type:
-   **Text Moderation**: AWS Comprehend → LocalMod → LLM-based Safety Audit.
-   **Image Moderation**: Ensemble of AWS Rekognition, Google Gemini Vision, and local models (OpenCV Yahoo NSFW, NudeNet, CLIP).
-   **Audio Moderation**: AWS Transcribe (or fallback transcribers) followed by the Text Moderation chain.

#### 4.1.3 Specialized Services
-   **Vision Service**: AWS Rekognition → Google Gemini Vision → Local OpenCV Heuristics.
-   **Speech Service**: AWS Transcribe → Google Gemini (Multimodal) → Local Heuristics.

### 4.2 Data Flow: Content Creation
1.  User enters prompt in **Creator Studio**.
2.  Frontend sends request to `POST /api/v1/create/caption`.
3.  Backend **LLM Service** attempts generation using the fallback chain (Bedrock -> Groq -> Gemini -> etc.).
4.  Generated text is automatically passed through the **Moderation Service** for a safety audit.
5.  Result is returned to Frontend with detailed metadata (provider used, safety status).

## 5. Deployment & Infrastructure
- **Media Storage**: AWS S3 for temporary and permanent asset hosting.
- **Hosting**: AWS Amplify (Frontend) and AWS EC2/App Runner (Backend).
- **Database**: Amazon RDS (PostgreSQL) or managed equivalents.

## 6. Security & Best Practices
- **Environment Variables**: Managed via `.env` (Local) and Secret Manager (Production).
- **CORS**: Configured to permit requests only from the frontend domain.
- **Rate Limiting**: (Planned) To prevent abuse of expensive AI endpoints.
