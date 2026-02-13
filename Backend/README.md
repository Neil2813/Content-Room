# Content Room - Backend 🔧

**FastAPI-powered AI Content Management API**

This is the backend service for Content Room, providing RESTful APIs for content creation, moderation, scheduling, and AI-powered features.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10 or higher
- PostgreSQL (or SQLite for development)
- OpenAI API key (for content generation)
- AWS credentials (optional, for advanced moderation)

### Installation

1. **Install dependencies**
```bash
pip install -r requirements.txt
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Initialize the database**
```bash
# Database will be created automatically on first run
# For PostgreSQL, ensure the database exists
```

4. **Run the server**
```bash
# Development (with auto-reload)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

5. **Access the API**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

---

## 📁 Project Structure

```
Backend/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration management
├── database.py            # Database connection & session
├── requirements.txt       # Python dependencies
├── routers/              # API route handlers
│   ├── auth.py           # Authentication endpoints
│   ├── calendar.py       # Content calendar generation
│   ├── competitor.py     # Competitor analysis
│   ├── creation.py       # Content creation tools
│   ├── moderation.py     # Content moderation
│   └── scheduler.py      # Post scheduling
├── models/               # SQLAlchemy database models
│   ├── user.py           # User model
│   └── content.py        # Content & scheduling models
└── services/             # Business logic & integrations
    ├── ai_service.py     # AI/LLM integrations
    ├── calendar_service.py
    ├── competitor_service.py
    └── aws_service.py    # AWS AI services
```

---

## 🔐 Authentication

### JWT-Based Authentication
- **Algorithm**: HS256
- **Password Hashing**: Argon2 (PHC winner, more secure than bcrypt)
- **Token Expiration**: Configurable (default: 30 days)

### Authentication Modes
- **Required**: Some endpoints require authentication
- **Optional**: Many endpoints work with or without auth
  - Competitor analysis
  - Content calendar generation
  - All creation tools

### Dependencies
- `get_current_user`: Requires valid JWT token
- `get_current_user_optional`: Returns None if not authenticated

---

## 🛠️ API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Create new user account | No |
| POST | `/login` | Login with credentials | No |
| GET | `/profile` | Get user profile | Yes |
| POST | `/logout` | Logout user | Yes |

### Content Creation (`/api/v1/create`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/caption` | Generate AI caption | No |
| POST | `/summary` | Generate content summary | No |
| POST | `/hashtags` | Generate relevant hashtags | No |
| POST | `/rewrite` | Rewrite with different tone | No |

### Content Moderation (`/api/v1/moderate`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/text` | Moderate text content | Optional |
| POST | `/image` | Moderate image content | Optional |
| POST | `/audio` | Moderate audio content | Optional |
| POST | `/video` | Moderate video content | Optional |
| POST | `/multimodal` | Moderate mixed content | Optional |

### Competitor Analysis (`/api/v1/competitor`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/analyze` | Analyze competitor profile | Optional |

### Content Calendar (`/api/v1/calendar`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/generate` | Generate monthly calendar | Optional |

### Post Scheduling (`/api/v1/schedule`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List scheduled posts | Yes |
| POST | `/` | Create scheduled post | Yes |
| GET | `/{id}` | Get post details | Yes |
| DELETE | `/{id}` | Cancel scheduled post | Yes |

### Social Platforms (`/api/v1/social`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/status` | Get all platforms status | No |
| POST | `/twitter/connect` | Connect Twitter account | No |
| POST | `/twitter/publish` | Publish to Twitter | No |
| GET | `/instagram/connect` | Get Instagram OAuth URL | No |
| POST | `/linkedin/connect` | Get LinkedIn OAuth URL | No |

---

## 🤖 AI Services Integration

### OpenAI GPT
- **Caption Generation**: Context-aware captions with platform optimization
- **Summary Generation**: Intelligent content summarization
- **Hashtag Generation**: Relevant hashtag suggestions
- **Tone Rewriting**: Multiple tone transformations
- **Competitor Analysis**: Strategic content gap analysis
- **Calendar Generation**: AI-powered content planning

### AWS AI Services (Optional)
- **Rekognition**: Image & video moderation
- **Transcribe**: Audio transcription
- **Comprehend**: Text sentiment analysis

### Fallback System
Automatic fallback to alternative providers if primary service fails.

---

## 🗄️ Database Models

### User
```python
- id: Integer (Primary Key)
- name: String
- email: String (Unique)
- hashed_password: String
- is_active: Boolean
- preferred_language: String
- created_at: DateTime
```

### Content
```python
- id: Integer (Primary Key)
- user_id: Integer (Foreign Key, nullable)
- content_type: String
- original_text: Text
- caption: Text
- summary: Text
- hashtags: JSON
- moderation_status: String
- workflow_status: String
- created_at: DateTime
```

### ScheduledPost
```python
- id: Integer (Primary Key)
- user_id: Integer (Foreign Key)
- title: String
- description: Text
- scheduled_at: DateTime
- status: String
- platform: String
- moderation_passed: Boolean
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/contentroom
# Or for SQLite (development):
# DATABASE_URL=sqlite:///./content_room.db

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# OpenAI
OPENAI_API_KEY=sk-...

# AWS (Optional)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Application
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🔄 Recent Updates

### v2.0.0 - Authentication Optional
- ✅ Made authentication optional for most endpoints
- ✅ Competitor analysis works without login
- ✅ Calendar generation works without login
- ✅ History saved only for authenticated users
- ✅ Improved error handling and user feedback

### Features
- ✅ JWT authentication with Argon2 password hashing
- ✅ Async SQLAlchemy for better performance
- ✅ Comprehensive input validation with Pydantic
- ✅ AI service fallback system
- ✅ Social media platform integration
- ✅ Multi-modal content moderation

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

---

## 📊 Performance

- **Async/Await**: Full async support for concurrent requests
- **Connection Pooling**: Efficient database connection management
- **Response Caching**: Smart caching for frequently accessed data
- **Rate Limiting**: Built-in protection against abuse

---

## 🛡️ Security Features

- **Argon2 Password Hashing**: Industry-leading security
- **JWT Tokens**: Stateless authentication
- **CORS Protection**: Configurable origins
- **SQL Injection Prevention**: SQLAlchemy ORM protection
- **Input Validation**: Pydantic schema validation
- **Content Moderation**: AI-powered safety checks

---

## 🐛 Debugging

### Enable Debug Mode
```bash
DEBUG=true uvicorn main:app --reload --log-level debug
```

### View Logs
```bash
# Application logs
tail -f app.log

# Database queries
# Set echo=True in database.py
```

---

## 📦 Dependencies

### Core
- `fastapi` - Modern web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM with async support
- `pydantic` - Data validation
- `python-jose` - JWT handling
- `argon2-cffi` - Password hashing

### AI Services
- `openai` - OpenAI API client
- `boto3` - AWS SDK
- `aiohttp` - Async HTTP client

### Database
- `asyncpg` - PostgreSQL async driver
- `aiosqlite` - SQLite async driver

See `requirements.txt` for complete list.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

**Backend API Documentation**: http://localhost:8000/docs
