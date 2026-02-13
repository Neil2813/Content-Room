import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authAPI, setAuthToken, getAuthToken, User as APIUser, APIError } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  preferred_language?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Transform API user to local user format
function transformUser(apiUser: APIUser): User {
  return {
    id: apiUser.id.toString(),
    name: apiUser.name,
    email: apiUser.email,
    preferred_language: apiUser.preferred_language,
    created_at: apiUser.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch and set user profile from API
  const fetchAndSetUser = useCallback(async (): Promise<{success: boolean; status?: number}> => {
    try {
      const profile = await authAPI.getProfile();
      const transformedUser = transformUser(profile);
      setUser(transformedUser);
      localStorage.setItem('auth-user', JSON.stringify(transformedUser));
      return { success: true };
    } catch (error) {
      console.warn('Failed to fetch user profile:', error);
      if (error instanceof APIError) {
        return { success: false, status: error.status };
      }
      return { success: false };
    }
  }, []);

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    if (getAuthToken()) {
      await fetchAndSetUser();
    }
  }, [fetchAndSetUser]);

  // Check for existing token on mount and auto-fetch user
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      // Try to load cached user first for immediate UI render
      const savedUserStr = localStorage.getItem('auth-user');
      
      if (token) {
        if (savedUserStr) {
          try {
             const savedUser = JSON.parse(savedUserStr);
             setUser(savedUser);
          } catch (e) {
             console.error("Failed to parse saved user", e);
          }
        }
        
        // Then verify with API in background
        try {
          const profile = await authAPI.getProfile();
          const transformedUser = transformUser(profile);
          setUser(transformedUser);
          localStorage.setItem('auth-user', JSON.stringify(transformedUser));
        } catch (error) {
           const err = error as APIError;
           console.warn('Failed to fetch user profile:', err);
           if (err.status === 401) {
             console.log('Session expired, clearing auth state');
             setAuthToken(null);
             setUser(null);
             localStorage.removeItem('auth-user');
           }
           // If network error, we keep the cached user (offline mode support)
        }
      } else {
        // No token
        setUser(null);
        localStorage.removeItem('auth-user');
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Auto-refresh user data periodically when authenticated
  useEffect(() => {
    if (!user) return;

    // Refresh every 5 minutes to keep data fresh
    const interval = setInterval(refreshUser, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, refreshUser]);

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    try {
      const response = await authAPI.login(email, password);
      const transformedUser = transformUser(response.user);
      setUser(transformedUser);
      localStorage.setItem('auth-user', JSON.stringify(transformedUser));
      // No need to fetch profile again - login response already has user data
    } catch (error) {
      if (error instanceof APIError) {
        throw new Error(error.message || 'Invalid email or password');
      }
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      throw new Error('All fields are required');
    }

    try {
      const response = await authAPI.register({ name, email, password });
      const transformedUser = transformUser(response.user);
      setUser(transformedUser);
      localStorage.setItem('auth-user', JSON.stringify(transformedUser));
      // No need to fetch profile again - register response already has user data
    } catch (error) {
      if (error instanceof APIError) {
        throw new Error(error.message || 'Registration failed');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed, clearing local session anyway');
    }
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('auth-user');
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('auth-user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
