# Content Room - Frontend 🎨

**React + TypeScript Modern Web Application**

This is the frontend application for Content Room, a beautiful and responsive UI for AI-powered content creation and management.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. **Install dependencies**
```bash
npm install
# or
yarn install
```

2. **Set up environment variables**
```bash
# Create .env file
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
```

3. **Run development server**
```bash
npm run dev
# or
yarn dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Hot reload enabled for instant updates

---

## 📁 Project Structure

```
Frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── layout/     # Layout components (Header, Sidebar)
│   │   └── auth/       # Auth-related components
│   ├── pages/          # Page components
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Studio.tsx
│   │   ├── Moderation.tsx
│   │   ├── Scheduler.tsx
│   │   ├── CompetitorAnalysis.tsx
│   │   ├── ContentCalendar.tsx
│   │   └── Settings.tsx
│   ├── contexts/       # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── LanguageContext.tsx
│   ├── services/       # API client & service layer
│   │   └── api.ts      # Centralized API client
│   ├── lib/           # Utility functions
│   ├── hooks/         # Custom React hooks
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Application entry point
├── index.html         # HTML template
├── vite.config.ts     # Vite configuration
└── package.json       # Dependencies
```

---

## 🎨 Tech Stack

### Core
- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **React Router v6** - Client-side routing

### UI & Styling
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Lucide React** - Beautiful icon set
- **React Markdown** - Markdown rendering

### State Management & Data
- **React Query** - Server state management
- **React Context** - Global state (Auth, Language)
- **Local Storage** - Client-side persistence

### Forms & Validation
- **React Hook Form** - Performant form handling
- **Zod** - TypeScript-first schema validation

---

## 🗺️ Routes

### Public Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Landing | Homepage with features |
| `/login` | Login | User login |
| `/register` | Register | User registration |

### Application Routes (No Auth Required)
| Path | Component | Description |
|------|-----------|-------------|
| `/studio` | Studio | Content creation hub |
| `/moderation` | Moderation | Content safety checks |
| `/scheduler` | Scheduler | Post scheduling |
| `/competitor` | CompetitorAnalysis | Competitor insights |
| `/calendar` | ContentCalendar | Content planning |
| `/settings` | Settings | User preferences |

**Note**: Authentication is optional. All features work without login. Logged-in users get history tracking and saved preferences.

---

## 🎨 Features

### Creator Studio
- **Multi-modal Input**: Text, image, audio, video support
- **AI Tools**:
  - Caption Generation (with length customization)
  - Summary Generation
  - Hashtag Generator (custom count)
  - Tone Rewriting (10+ tones)
- **Translation**: Multi-language support
- **Real-time Preview**: See results instantly

### Moderation Dashboard
- **Text Moderation**: Safety score with explanations
- **Image Analysis**: Visual content checking
- **Audio Intelligence**: Transcription + moderation
- **Video Moderation**: Frame-by-frame analysis
- **Results Display**: Clear, actionable feedback

### Competitor Intelligence
- **URL Analysis**: Analyze any public profile
- **Gap Identification**: Find content opportunities
- **Strategic Insights**: AI-powered recommendations
- **Markdown Output**: Beautiful formatted results

### Content Calendar
- **Monthly Planning**: Generate full month calendars
- **Festival Integration**: Indian festivals included
- **Niche Customization**: Tailored to your industry
- **Export Ready**: Markdown format

### Schedule Plan
- **Multi-Platform**: Twitter, Instagram, LinkedIn
- **Media Upload**: Image/video support
- **Time Selection**: Flexible scheduling
- **Moderation Check**: Pre-publish safety

### Settings
- **Profile Management**: Update name, email
- **Theme Toggle**: Dark/Light mode
- **Language Selection**: Multi-language UI
- **Platform Connections**: Social media linking

---

## 🎨 UI Components

### shadcn/ui Components Used
- Button, Input, Label, Textarea
- Card, Badge, Alert
- Dialog, Sheet, Tabs
- Select, Dropdown Menu
- Toast, Sonner (notifications)
- Avatar, Separator

### Custom Components
- `DashboardLayout` - Main app layout with sidebar
- `ProtectedRoute` - Route protection (now optional)
- Specialized forms and inputs

---

## 🔐 Authentication Flow

### Context-Based Auth
```typescript
// Using auth context
const { user, isAuthenticated, login, logout } = useAuth();

// Optional auth - features work regardless of auth state
// History and preferences saved only for logged-in users
```

### API Integration
```typescript
// API client automatically includes auth headers
import api from '@/services/api';

// All requests handle both authenticated and anonymous users
const result = await api.competitor.analyze(url, niche);
```

---

## 📡 API Integration

### Centralized API Client (`services/api.ts`)

```typescript
// All API endpoints organized by feature
import api from '@/services/api';

// Authentication
await api.auth.login(email, password);
await api.auth.register(name, email, password);

// Content Creation
await api.creation.generateCaption(text, type, maxLength);
await api.creation.generateHashtags(text, count);

// Moderation
await api.moderation.moderateText(text);
await api.moderation.moderateImage(file);

// Competitor
await api.competitor.analyze(url, niche);

// Calendar
await api.calendar.generate({ month, year, niche, goals });

// Scheduling
await api.scheduler.createPost(data);
```

### Error Handling
```typescript
try {
  const result = await api.competitor.analyze(url, niche);
} catch (error) {
  if (error instanceof APIError) {
    if (error.status === 401) {
      // Handle authentication error
    } else {
      // Handle other API errors
    }
  }
}
```

---

## 🎨 Styling

### TailwindCSS Setup
- **Dark Mode**: Class-based dark mode support
- **Custom Theme**: Extended with brand colors
- **Responsive**: Mobile-first design
- **Animations**: Smooth transitions

### CSS Variables
```css
/* Light/Dark mode colors defined in index.css */
--background, --foreground
--primary, --primary-foreground
--card, --card-foreground
--muted, --muted-foreground
```

---

## 🔧 Configuration

### Environment Variables (`.env`)
```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000

# Optional: Other configuration
VITE_APP_NAME=Content Room
```

### Vite Config (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

## 📦 Scripts

```bash
# Development
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

---

## 🎨 Design System

### Colors
- **Primary**: Custom brand color (#your-color)
- **Secondary**: Complementary accent
- **Destructive**: Error states
- **Muted**: Secondary text

### Typography
- **Font**: System font stack for optimal performance
- **Sizes**: Responsive text sizing
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Spacing
- Consistent 4px spacing scale
- Container padding: 1rem on mobile, 2rem on desktop

---

## 🔄 Recent Updates

### v2.0.0 - Open Access
- ✅ Removed authentication requirements
- ✅ All features work without login
- ✅ Streamlined navigation (removed History, Dashboard)
- ✅ Enhanced error handling
- ✅ Improved user feedback with toast notifications

### Features
- ✅ Beautiful, responsive UI
- ✅ Dark/Light mode support
- ✅ Real-time updates
- ✅ Optimistic UI updates
- ✅ Comprehensive error handling
- ✅ Loading states for all operations

---

## 🧪 Development

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `DashboardLayout.tsx` (if needed)
4. Connect to API in `src/services/api.ts`

### Adding a New Component
1. Create in `src/components/`
2. Export from component file
3. Import where needed
4. Style with TailwindCSS

---

## 🎯 Performance

- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Images and heavy components
- **Tree Shaking**: Unused code elimination
- **Minification**: Production build optimization
- **Caching**: Smart browser caching

---

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: sm, md, lg, xl, 2xl
- **Touch Friendly**: Large tap targets
- **Adaptive UI**: Components adjust to screen size

---

## 🤝 Contributing

1. Follow the established file structure
2. Use TypeScript for all new code
3. Follow the existing component patterns
4. Add proper error handling
5. Test on multiple devices/browsers

---

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 5173
npx kill-port 5173
# Or use different port
npm run dev -- --port 3000
```

**Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build Errors**
```bash
# Type check
npm run type-check
# Fix linting issues
npm run lint -- --fix
```

---

## 📄 License

MIT License - See LICENSE file for details

---

**Live Development**: http://localhost:5173
**API Documentation**: http://localhost:8000/docs
