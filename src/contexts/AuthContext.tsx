import React, { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext, type User, type AuthContextType } from './auth-context'
import { API_CONFIG, buildApiUrl } from '@/lib/api-config';
import { authAPI } from '@/lib/auth-api';

function decodeJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const claims = decodeJwt<any>(token);
  if (!claims || !claims.exp) return false;
  // exp is in seconds since epoch
  const nowSec = Math.floor(Date.now() / 1000);
  return Number(claims.exp) <= nowSec;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  // Cache profile retrieval per access token
  const fetchedTokenRef = React.useRef<string | null>(null);

  const login = React.useCallback(async (token: string) => {
  // Store canonical session token key for clarity
  localStorage.setItem('session_token', token);
    localStorage.setItem('access_token', token);
    setLoading(true);
    setError(null);

    try {
      // If we've already fetched profile for this token, don't re-fetch
      if (fetchedTokenRef.current === token && user) {
        setLoading(false);
        return;
      }
      // Use centralized cache-aware fetch (requires token to be present)
      const profile = await authAPI.fetchUserProfile();
      if ((profile as any)?.error) {
        // Fall back to minimal user from JWT if available
        const claims = decodeJwt<any>(token);
        if (claims) {
          const minimal: User = {
            id: claims.sub || claims.user_id || 'self',
            email: claims.email || 'unknown',
            name: claims.name || claims.preferred_username || 'User',
          };
          setUser(minimal);
        } else {
          throw new Error('Failed to fetch profile');
        }
      } else {
        setUser(profile as User);
      }
  fetchedTokenRef.current = token;
  // no-op: we don't maintain separate logged-in flags; presence of access_token is source of truth
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Login failed:', errorMessage);
      // Do not clear tokens immediately; allow UI to retry or continue with JWT-derived user where possible
      const existing = localStorage.getItem('access_token') || token;
      const claims = decodeJwt<any>(existing);
      if (claims) {
        const minimal: User = {
          id: claims.sub || claims.user_id || 'self',
          email: claims.email || 'unknown',
          name: claims.name || claims.preferred_username || 'User',
        };
        setUser(minimal);
  fetchedTokenRef.current = token;
  // no-op: we don't maintain separate logged-in flags
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logout = () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  // no-op: no separate logged-in flags to clear
    setUser(null);
    setError(null);
  fetchedTokenRef.current = null;
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Consider session alive if we have an access token; use refresh only when needed
      // Prefer canonical key, then fallbacks for a limited time
      const access = localStorage.getItem('access_token')
        || localStorage.getItem('session_token');
      if (!access) {
        setLoading(false);
        return;
      }

      // If access token is expired, try to refresh if refresh_token exists
      if (isJwtExpired(access)) {
        try {
          const refreshed = await authAPI.refreshToken();
          if (refreshed && refreshed.access_token) {
            await login(refreshed.access_token);
            return;
          }
        } catch {
          // ignore, will handle below
        }
        // If refresh didn’t succeed, don’t hard-logout here; proceed with minimal JWT if possible
        const stillHave = localStorage.getItem('access_token')
          || localStorage.getItem('session_token');
        if (!stillHave) {
          // Tokens were cleared (likely 401). Finish without user and allow ProtectedRoute to handle.
          setLoading(false);
          return;
        }
        await login(stillHave);
        return;
      }

      // Only fetch once per token
      if (fetchedTokenRef.current !== access) {
        await login(access);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [location.pathname, login]);

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook moved to ./useAuth to keep this file components-only exports