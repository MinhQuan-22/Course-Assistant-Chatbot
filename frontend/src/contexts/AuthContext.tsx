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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  const saveAuth = (data: any) => {
    const normalizedUser: User = {
      id: String(data.user.id),
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      avatar: data.user.avatar || '',
    };

    setToken(data.token);
    setUser(normalizedUser);

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
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