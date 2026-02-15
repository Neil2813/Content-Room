# Content Room 🎨

**AI-Powered Content Creation & Management Platform**

Content Room is a comprehensive web application that helps content creators streamline their workflow with AI-powered tools for content generation, moderation, scheduling, and competitor analysis.

---

## ✨ Features

### 🎨 **Creator Studio**
- **Caption Generation**: AI-powered captions with customizable length and platform optimization
- **Summary Generation**: Intelligent content summarization
- **Hashtag Generator**: Get relevant hashtags for maximum reach
- **Tone Rewriting**: Transform content into different tones (Professional, Casual, Friendly, etc.)
- **Multilingual Translation**: Support for multiple languages

### 🛡️ **Content Moderation**
- **Text Moderation**: AI-powered safety checks with detailed explanations
- **Image Analysis**: Visual content safety validation
- **Audio Intelligence**: Transcription and content moderation for audio
- **Video Moderation**: Frame-by-frame analysis for video content
- **Multimodal Support**: Combine text, image, and audio moderation

### 🔍 **Competitor Intelligence**
- Analyze competitor social profiles and blogs
- Identify content gaps and opportunities
- Get strategic insights for your niche
- **No login required** - Try it instantly!

### 📅 **Content Calendar**
- Generate monthly content calendars
- Includes Indian festivals and special dates
- Customized for your niche and goals
- **No login required** - Start planning immediately!

### ⏰ **Schedule Plan**
- Schedule posts for future publication
- Post preparation and preview
- AI-powered moderation before publishing
- Media upload and management

### ⚙️ **Settings**
- Profile management
- Social media platform connections
- Theme customization (Dark/Light mode)
- Language preferences

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **PostgreSQL** or **SQLite** for database

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Content-Room
```

2. **Set up the Backend**
```bash
cd Backend
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
python -m uvicorn main:app --reload
```

3. **Set up the Frontend**
```bash
cd Frontend
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **TailwindCSS** for styling
- **shadcn/ui** components
- **React Router** for navigation
- **React Query** for data fetching

### Backend Stack
- **FastAPI** (Python async framework)
- **SQLAlchemy** with async support
- **PostgreSQL/SQLite** database
- **JWT** authentication with Argon2 password hashing
- **OpenAI & AWS AI Services** integration
- **Pydantic** for data validation

---

## 📁 Project Structure

```
Content-Room/
├── Backend/           # FastAPI backend
│   ├── routers/      # API endpoints
│   ├── services/     # Business logic & AI integration
│   ├── models/       # Database models
│   └── config.py     # Configuration
├── Frontend/         # React frontend
│   ├── src/
│   │   ├── pages/   # Page components
│   │   ├── components/ # Reusable components
│   │   ├── services/   # API client
│   │   └── contexts/   # React contexts
│   └── public/      # Static assets
└── README.md        # This file
```

---

## 🔐 Authentication

**Optional Authentication Model**
- All features are accessible without login
- User accounts enable:
  - History tracking
  - Personal settings
  - Content saving
  - Schedule management

**Secure by Default**
- Argon2 password hashing (PHC winner)
- JWT tokens with configurable expiration
- Optional user authentication for privacy

---

## 🌐 API Endpoints

### Main Endpoints
- `/api/v1/auth/*` - Authentication & user management
- `/api/v1/create/*` - Content generation (captions, summaries, hashtags)
- `/api/v1/moderate/*` - Content moderation
- `/api/v1/competitor/*` - Competitor analysis
- `/api/v1/calendar/*` - Content calendar generation
- `/api/v1/schedule/*` - Post scheduling and management

Full API documentation available at: http://localhost:8000/docs

---

## 🎨 Features Highlights

### No Login Required ✨
Try these features instantly without creating an account:
- Competitor Analysis
- Content Calendar Generation
- All creation tools

### AI-Powered 🤖
- OpenAI GPT for content generation
- AWS Rekognition for image moderation
- AWS Transcribe for audio processing
- Intelligent fallback systems

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
```env
DATABASE_URL=postgresql://user:pass@localhost/contentroom
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

For issues and questions:
- Check the [API Documentation](http://localhost:8000/docs)
- Review the Frontend and Backend README files
- Open an issue on GitHub

---

**Built with ❤️ for Content Creators**
