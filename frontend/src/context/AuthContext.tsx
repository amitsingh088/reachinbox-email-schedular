import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractUserFromToken(token: string): User | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: (payload.id ?? payload.sub ?? '') as string,
    name: (payload.name ?? '') as string,
    email: (payload.email ?? '') as string,
    avatar: (payload.avatar ?? payload.picture ?? '') as string,
    slackConnected: (payload.slackConnected ?? false) as boolean,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const decoded = extractUserFromToken(storedToken);
      if (decoded) {
        setToken(storedToken);
        setUser(decoded);
      } else {
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const decoded = extractUserFromToken(newToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
