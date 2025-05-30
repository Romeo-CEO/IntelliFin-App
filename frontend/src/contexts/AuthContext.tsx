'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: string;
  settings?: any;
  timezone?: string;
  language?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  phone?: string;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  clearError: () => void;
}

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage utilities
const TOKEN_KEY = 'intellifin_tokens';
const USER_KEY = 'intellifin_user';

const storage = {
  setTokens: (tokens: AuthTokens) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    }
  },
  getTokens: (): AuthTokens | null => {
    if (typeof window !== 'undefined') {
      const tokens = localStorage.getItem(TOKEN_KEY);
      return tokens ? JSON.parse(tokens) : null;
    }
    return null;
  },
  setUser: (user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },
};

// API utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
};

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const tokens = storage.getTokens();
        const user = storage.getUser();

        if (tokens && user) {
          // Verify token is still valid
          const response = await apiCall('/api/v1/auth/me', {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.user, tokens },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        // Token is invalid, clear storage
        storage.clear();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await apiCall('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const { user, tokens } = response;

      // Store in localStorage
      storage.setTokens(tokens);
      storage.setUser(user);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, tokens },
      });

      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await apiCall('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast.success(response.message || 'Registration successful! Please check your email to verify your account.');
      router.push('/auth/login?message=registration-success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
    }
  };

  const logout = async () => {
    try {
      if (state.tokens) {
        await apiCall('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.tokens.accessToken}`,
          },
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      storage.clear();
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
      router.push('/auth/login');
    }
  };

  const refreshToken = async () => {
    try {
      const tokens = storage.getTokens();
      if (!tokens) {
        throw new Error('No refresh token available');
      }

      const response = await apiCall('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      const newTokens = response.tokens;
      storage.setTokens(newTokens);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: state.user!, tokens: newTokens },
      });
    } catch (error) {
      // Refresh failed, logout user
      storage.clear();
      dispatch({ type: 'LOGOUT' });
      router.push('/auth/login');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      dispatch({ type: 'AUTH_START' });

      await apiCall('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      toast.success('Password reset instructions sent to your email');
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });

      await apiCall('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      toast.success('Password reset successful! Please login with your new password.');
      router.push('/auth/login?message=password-reset-success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      dispatch({ type: 'AUTH_START' });

      await apiCall('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      toast.success('Email verified successfully! You can now login.');
      router.push('/auth/login?message=email-verified');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email verification failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
    }
  };

  const resendVerification = async (email: string) => {
    try {
      dispatch({ type: 'AUTH_START' });

      await apiCall('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      toast.success('Verification email sent! Please check your inbox.');
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification email';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
