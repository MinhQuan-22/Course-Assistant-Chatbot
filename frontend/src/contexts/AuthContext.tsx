import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';

interface LoginPayload {
  identifier: string;
  password: string;
}

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResult>;
  loginWithGoogle: (credential: string) => Promise<AuthResult>;
  signup: (payload: SignupPayload) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://127.0.0.1:8000/api';

/** Normalize raw API user object → typed User */
function normalizeUser(raw: any): User {
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    role: raw.role,
    avatar: raw.avatar || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On first render, verify stored token against /auth/me/.
   * This is critical for hard-reload: we can't trust localStorage blindly
   * because an expired/invalid token would allow ProtectedRoute to render
   * briefly before redirect, causing a blank screen for teacher/student.
   */
  useEffect(() => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      // No token at all → go straight to login
      setIsLoading(false);
      return;
    }

    // Token exists → verify with server
    fetch(`${API_BASE_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          // Token invalid / expired → clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          return;
        }
        const data = await res.json();
        const verified = normalizeUser(data.user);
        setToken(storedToken);
        setUser(verified);
        // Keep localStorage in sync with fresh server data
        localStorage.setItem('user', JSON.stringify(verified));
      })
      .catch(() => {
        // Network error (backend not reachable) → keep cached user so the
        // app still works offline, but mark loading as done.
        const cached = localStorage.getItem('user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
            setToken(storedToken);
          } catch {
            localStorage.removeItem('user');
          }
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const saveAuth = (data: any) => {
    const normalized = normalizeUser(data.user);
    setToken(data.token);
    setUser(normalized);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalized));
  };

  const login = async ({ identifier, password }: LoginPayload): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Login failed',
        };
      }

      saveAuth(data);
      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Cannot connect to the server',
      };
    }
  };

  const loginWithGoogle = async (credential: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Google login failed',
        };
      }

      saveAuth(data);
      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Could not connect to server',
      };
    }
  };

  const signup = async ({ name, email, password }: SignupPayload): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Sign up failed',
        };
      }

      saveAuth(data);
      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Cannot connect to the server',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        loginWithGoogle,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}