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

  const login = async (token: string) => {
    // Keep both keys for compatibility with other parts of the app
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
    setLoading(true);
    setError(null);

    try {
      const meUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
      console.log('[AuthContext] Fetching profile from', meUrl);
      const response = await fetch(meUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      // Handle rate limiting quickly
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 'unknown';
        throw new Error(`Rate limited (429). Retry-After: ${retryAfter}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        // Try to capture response body for diagnostics
        if (contentType.includes('application/json')) {
          const errJson = await response.json().catch(() => ({}));
          const msg = errJson?.message || JSON.stringify(errJson) || `HTTP ${response.status}`;
          throw new Error(`Failed to fetch profile: ${msg}`);
        } else {
          const text = await response.text().catch(() => '');
          throw new Error(`Failed to fetch profile: HTTP ${response.status} ${text?.slice(0, 120)}`);
        }
      }

      if (!contentType.includes('application/json')) {
        // Non-JSON (likely HTML). Fall back to decoding JWT for minimal user info.
        const claims = decodeJwt<any>(token);
        console.warn('[AuthContext] /me returned non-JSON. Using JWT claims as fallback.');
        if (claims) {
          const minimal: User = {
            id: claims.sub || claims.user_id || 'self',
            email: claims.email || 'unknown',
            name: claims.name || claims.preferred_username || 'User',
          };
          setUser(minimal);
          return;
        }
        throw new Error('Profile response not JSON and JWT decode failed');
      }

      const profile = await response.json();
      setUser(profile);
      try {
        localStorage.setItem('sck_logged_in', '1');
        sessionStorage.setItem('sck_logged_in', '1');
      } catch (e) {
        console.warn('Failed to persist session flag', e);
      }
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
        try {
          localStorage.setItem('sck_logged_in', '1');
          sessionStorage.setItem('sck_logged_in', '1');
        } catch (e) {
          // ignore
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  try {
    localStorage.removeItem('sck_logged_in');
    sessionStorage.removeItem('sck_logged_in');
  } catch (e) {
    // ignore
  }
    setUser(null);
    setError(null);
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Do not fetch /auth/v1/me on the public login page
      if (location.pathname === '/login') {
        setLoading(false);
        return;
      }

      // Consider session alive if we have an access token; use refresh only when needed
      const access = localStorage.getItem('access_token') || localStorage.getItem('token');
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
        const stillHave = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!stillHave) {
          // Tokens were cleared (likely 401). Finish without user and allow ProtectedRoute to handle.
          setLoading(false);
          return;
        }
        await login(stillHave);
        return;
      }

      await login(access);
    };

    initializeAuth();
  }, [location.pathname]);

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