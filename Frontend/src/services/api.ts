/**
 * ContentOS API Client
 * 
 * Centralized API client for all backend interactions.
 * Provides typed interfaces and error handling for the ContentOS backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

// ============================================
// Types & Interfaces
// ============================================

// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  preferred_language?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Creation Types
export interface GenerateRequest {
  content: string;
  content_type?: string;
  language?: string;
}

export interface GenerateResponse {
  result: string;
  provider: string;
  fallback_used: boolean;
}

export interface HashtagsResponse {
  hashtags: string[];
  provider: string;
}

// Moderation Types
export interface ModerationRequest {
  text: string;
  language?: string;
}

export interface ModerationResponse {
  decision: 'ALLOW' | 'FLAG' | 'ESCALATE';
  safety_score: number;
  confidence: number;
  explanation: string;
  flags: string[];
  provider: string;
  processing_time_ms: number;
}

export interface MultimodalModerationResponse {
  decision: 'ALLOW' | 'FLAG' | 'ESCALATE';
  overall_safety_score: number;
  combined_flags: string[];
  results: {
    text?: ModerationResponse;
    image?: {
      is_safe: boolean;
      safety_score: number;
      labels: string[];
    };
    audio?: {
      transcript: string;
      safety_score: number;
      flags: string[];
    };
  };
}

// Scheduler Types
export interface ScheduleRequest {
  title: string;
  description?: string;
  scheduled_at: string;
  platform?: string;
  user_id?: number;
  media_url?: string;
  skip_moderation?: boolean;
}

export interface ScheduledPost {
  id: number;
  title: string;
  description?: string;
  scheduled_at: string;
  status: string;
  platform?: string;
  ai_optimized: boolean;
  moderation_passed: boolean;
  moderation_reason?: string;
  created_at: string;
}

// Analytics Types
export interface DashboardMetrics {
  total_content: number;
  content_this_week: number;
  moderation_safe: number;
  moderation_flagged: number;
  scheduled_posts: number;
  published_posts: number;
}

export interface ModerationStats {
  total_moderated: number;
  safe_count: number;
  warning_count: number;
  unsafe_count: number;
  escalated_count: number;
  average_safety_score: number;
}

export interface ProviderStats {
  current_providers: {
    llm: string;
    vision: string;
    speech: string;
    translation: string;
  };
  aws_configured: boolean;
  fallback_chain: Record<string, string[]>;
}

// Translation Types
export interface TranslateRequest {
  text: string;
  target_language: string;
  source_language?: string;
}

export interface TranslateResponse {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  provider: string;
}

// ============================================
// API Error Handling
// ============================================

export class APIError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.detail || errorData.message || `Error ${response.status}`,
      response.status,
      errorData
    );
  }
  return response.json();
}

// ============================================
// Token Management
// ============================================

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth-token', token);
  } else {
    localStorage.removeItem('auth-token');
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('auth-token');
  }
  return authToken;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ============================================
// Auth API
// ============================================

export const authAPI = {
  async register(data: RegisterData): Promise<TokenResponse> {
    const response = await fetch(`${API_V1}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<TokenResponse>(response);
    setAuthToken(result.access_token);
    return result;
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_V1}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    const result = await handleResponse<TokenResponse>(response);
    setAuthToken(result.access_token);
    return result;
  },

  async getProfile(): Promise<User> {
    const response = await fetch(`${API_V1}/auth/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User>(response);
  },

  async logout(): Promise<void> {
    await fetch(`${API_V1}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    setAuthToken(null);
    localStorage.removeItem('auth-user');
  },
};

// ============================================
// Creation API
// ============================================

export const creationAPI = {
  async generateCaption(content: string, contentType = 'text'): Promise<GenerateResponse> {
    const response = await fetch(`${API_V1}/create/caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, content_type: contentType }),
    });
    return handleResponse<GenerateResponse>(response);
  },

  async generateSummary(content: string): Promise<GenerateResponse> {
    const response = await fetch(`${API_V1}/create/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse<GenerateResponse>(response);
  },

  async generateHashtags(content: string, count = 5): Promise<HashtagsResponse> {
    const response = await fetch(`${API_V1}/create/hashtags?count=${count}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse<HashtagsResponse>(response);
  },

  async rewriteTone(content: string, tone: string): Promise<{ original: string; rewritten: string; tone: string; provider: string }> {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('tone', tone);

    const response = await fetch(`${API_V1}/create/rewrite`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },
};

// ============================================
// Moderation API
// ============================================

export const moderationAPI = {
  async moderateText(text: string, language = 'en'): Promise<ModerationResponse> {
    const response = await fetch(`${API_V1}/moderate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    return handleResponse<ModerationResponse>(response);
  },

  async moderateImage(file: File): Promise<{ filename: string } & Partial<ModerationResponse>> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_V1}/moderate/image`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async moderateAudio(file: File): Promise<{ filename: string; transcript?: string } & Partial<ModerationResponse>> {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${API_V1}/moderate/audio`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async moderateVideo(file: File): Promise<{ 
    filename: string; 
    video_info?: { duration_seconds: number; total_frames: number; frames_analyzed: number };
    frame_results?: Array<{ frame_index: number; timestamp: number; safety_score: number; flags: string[] }>;
  } & Partial<ModerationResponse>> {
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${API_V1}/moderate/video`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async moderateMultimodal(
    text?: string,
    image?: File,
    audio?: File
  ): Promise<MultimodalModerationResponse> {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (image) formData.append('image', image);
    if (audio) formData.append('audio', audio);

    const response = await fetch(`${API_V1}/moderate/multimodal`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<MultimodalModerationResponse>(response);
  },
};

// ============================================
// Scheduler API
// ============================================

export const schedulerAPI = {
  async createPost(data: ScheduleRequest): Promise<ScheduledPost> {
    const response = await fetch(`${API_V1}/schedule/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ScheduledPost>(response);
  },

  async createPostWithMedia(
    title: string,
    scheduledAt: string,
    file: File,
    description?: string,
    platform?: string
  ): Promise<{ post: ScheduledPost; media: unknown; moderation_passed: boolean }> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('scheduled_at', scheduledAt);
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (platform) formData.append('platform', platform);

    const response = await fetch(`${API_V1}/schedule/with-media`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async listPosts(status?: string, platform?: string, userId = 1): Promise<ScheduledPost[]> {
    const params = new URLSearchParams({ user_id: userId.toString() });
    if (status) params.append('status', status);
    if (platform) params.append('platform', platform);

    const response = await fetch(`${API_V1}/schedule/?${params}`);
    return handleResponse<ScheduledPost[]>(response);
  },

  async getPost(postId: number): Promise<ScheduledPost> {
    const response = await fetch(`${API_V1}/schedule/${postId}`);
    return handleResponse<ScheduledPost>(response);
  },

  async cancelPost(postId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_V1}/schedule/${postId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async checkModeration(text?: string, file?: File): Promise<{
    passed: boolean;
    is_safe: boolean;
    confidence: number;
    reason?: string;
    labels: string[];
  }> {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (file) formData.append('file', file);

    const response = await fetch(`${API_V1}/schedule/check-moderation`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },
};

// ============================================
// Analytics API
// ============================================

export const analyticsAPI = {
  async getDashboard(userId = 1, platform?: string): Promise<DashboardMetrics> {
    let url = `${API_V1}/analytics/dashboard?user_id=${userId}`;
    if (platform && platform !== 'all') {
      url += `&platform=${platform}`;
    }
    const response = await fetch(url);
    return handleResponse<DashboardMetrics>(response);
  },

  async getModerationStats(userId = 1, platform?: string): Promise<ModerationStats> {
    let url = `${API_V1}/analytics/moderation?user_id=${userId}`;
    if (platform && platform !== 'all') {
      url += `&platform=${platform}`;
    }
    const response = await fetch(url);
    return handleResponse<ModerationStats>(response);
  },

  async getProviderStats(): Promise<ProviderStats> {
    const response = await fetch(`${API_V1}/analytics/providers`);
    return handleResponse<ProviderStats>(response);
  },
};

// ============================================
// Translation API
// ============================================

export const translationAPI = {
  async translate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslateResponse> {
    const response = await fetch(`${API_V1}/translate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_lang: targetLanguage,
        source_lang: sourceLanguage,
      }),
    });
    return handleResponse<TranslateResponse>(response);
  },

  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    const response = await fetch(`${API_V1}/translate/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const result = await handleResponse<{ detected_language: string; confidence: number }>(response);
    return { language: result.detected_language, confidence: result.confidence };
  },

  async getLanguages(): Promise<{ languages: { code: string; name: string; native?: string }[] }> {
    const response = await fetch(`${API_V1}/translate/languages`);
    const result = await handleResponse<{ code: string; name: string; native: string }[]>(response);
    // Backend returns array directly, wrap in object
    return { languages: result };
  },
};

// ============================================
// Social Connect API
// ============================================

export interface PlatformStatus {
  platform: string;
  configured: boolean;
  connected: boolean;
  auth_type: 'oauth' | 'credentials';
  note?: string;
}

export interface AllPlatformsStatus {
  platforms: {
    twitter: PlatformStatus & { note: string };
    instagram: PlatformStatus & { note: string };
    linkedin: PlatformStatus & { note: string };
  };
  scheduler: {
    running: boolean;
    pending_posts: number;
  };
}

export interface PublishResponse {
  success: boolean;
  platform: string;
  post_id?: string;
  post_url?: string;
  error?: string;
  mode?: string;
}

export const socialConnectAPI = {
  // Get all platforms status
  async getAllStatus(userId = 1): Promise<AllPlatformsStatus> {
    const response = await fetch(`${API_V1}/social/status?user_id=${userId}`);
    return handleResponse<AllPlatformsStatus>(response);
  },

  // Twitter (using credentials - no API key needed!)
  twitter: {
    async getStatus(userId = 1): Promise<PlatformStatus> {
      const response = await fetch(`${API_V1}/social/twitter/status?user_id=${userId}`);
      return handleResponse<PlatformStatus>(response);
    },

    async connect(username: string, email: string, password: string, userId = 1): Promise<{ success: boolean; message: string }> {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('user_id', userId.toString());

      const response = await fetch(`${API_V1}/social/twitter/connect`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse(response);
    },

    async disconnect(userId = 1): Promise<{ success: boolean }> {
      const response = await fetch(`${API_V1}/social/twitter/disconnect?user_id=${userId}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    },

    async publish(content: string, mediaUrls?: string[], userId = 1): Promise<PublishResponse> {
      const response = await fetch(`${API_V1}/social/twitter/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, media_urls: mediaUrls, user_id: userId }),
      });
      return handleResponse<PublishResponse>(response);
    },
  },

  // Instagram (OAuth via Facebook)
  instagram: {
    async getStatus(userId = 1): Promise<PlatformStatus> {
      const response = await fetch(`${API_V1}/social/instagram/status?user_id=${userId}`);
      return handleResponse<PlatformStatus>(response);
    },

    async getConnectUrl(userId = 1, redirectUri?: string): Promise<{ url: string; platform: string }> {
      const params = new URLSearchParams({ user_id: userId.toString() });
      if (redirectUri) params.append('redirect_uri', redirectUri);

      const response = await fetch(`${API_V1}/social/instagram/connect?${params}`);
      return handleResponse(response);
    },

    async disconnect(userId = 1): Promise<{ success: boolean }> {
      const response = await fetch(`${API_V1}/social/instagram/disconnect?user_id=${userId}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    },

    async publish(content: string, mediaUrls?: string[], userId = 1): Promise<PublishResponse> {
      const response = await fetch(`${API_V1}/social/instagram/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, media_urls: mediaUrls, user_id: userId }),
      });
      return handleResponse<PublishResponse>(response);
    },
  },

  // LinkedIn (OAuth)
  linkedin: {
    async getStatus(userId = 1): Promise<PlatformStatus> {
      const response = await fetch(`${API_V1}/social/linkedin/status?user_id=${userId}`);
      return handleResponse<PlatformStatus>(response);
    },

    async getConnectUrl(userId = 1, redirectUri?: string): Promise<{ url: string; platform: string }> {
      const params = new URLSearchParams({ user_id: userId.toString() });
      if (redirectUri) params.append('redirect_uri', redirectUri);

      const response = await fetch(`${API_V1}/social/linkedin/connect?${params}`);
      return handleResponse(response);
    },

    async disconnect(userId = 1): Promise<{ success: boolean }> {
      const response = await fetch(`${API_V1}/social/linkedin/disconnect?user_id=${userId}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    },

    async publish(content: string, mediaUrls?: string[], userId = 1): Promise<PublishResponse> {
      const response = await fetch(`${API_V1}/social/linkedin/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, media_urls: mediaUrls, user_id: userId }),
      });
      return handleResponse<PublishResponse>(response);
    },
  },
};

// ============================================
// Health Check
// ============================================

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Default export for convenience
const api = {
  auth: authAPI,
  creation: creationAPI,
  moderation: moderationAPI,
  scheduler: schedulerAPI,
  analytics: analyticsAPI,
  translation: translationAPI,
  socialConnect: socialConnectAPI,
  checkHealth: checkBackendHealth,
  setAuthToken,
  getAuthToken,
};

export default api;
