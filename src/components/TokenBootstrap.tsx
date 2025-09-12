import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { refreshAccessToken, selectTokens } from '@/store/slices/authSlice';
import type { OAuthTokenResponse } from '@/store/types';

type AuthTokens = OAuthTokenResponse & { expires_at?: number };

/**
 * TokenBootstrap
 * - Single, top-layer bootstrap that restores an access token into Redux
 *   using the refresh_token stored in sessionStorage.
 * - Runs once on app load or when tokens are missing/expired.
 * - Avoids per-form hacks: one place for all 500+ pages.
 */
export default function TokenBootstrap() {
  const dispatch = useAppDispatch();
  const tokens = useAppSelector(selectTokens as any) as AuthTokens | null;
  const startedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
  // If a refresh just happened this tick (e.g., SessionManager or another tab), skip
  try {
    const lastAt = sessionStorage.getItem('sck_last_refresh_at');
    if (lastAt && Date.now() - Date.parse(lastAt) < 750) return;
  } catch { /* ignore */ }
  // Skip bootstrap on public routes where we intentionally hard-logout
  const pathname = location?.pathname || '/';
  const isPublicRoute = (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/enter-code') ||
    pathname.startsWith('/new-password') ||
    pathname.startsWith('/no-account') ||
    pathname.startsWith('/new-password-success') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/authorized') ||
    pathname.startsWith('/github')
  );
  if (isPublicRoute) return;

  // Do not bootstrap while OAuth callback is processing
  try { if (sessionStorage.getItem('oauth_processing') === '1') return; } catch { /* ignore */ }

  // If we already have a valid access token in memory, nothing to do
    const hasAccess = Boolean(tokens?.access_token);
    const now = Date.now();
    const expMs = typeof tokens?.expires_at === 'number' ? tokens!.expires_at! : 0;
    const leewayMs = Number((import.meta as any)?.env?.VITE_ACCESS_REFRESH_LEEWAY_MS ?? 5 * 60 * 1000);
    const needsRefresh = hasAccess ? (expMs > 0 && (expMs - now) <= leewayMs) : true;

    // Check presence of refresh token in session storage
    let hasRefresh = false;
    try { hasRefresh = Boolean(sessionStorage.getItem('refresh_token')); } catch { /* ignore */ }

  if (!startedRef.current && hasRefresh && needsRefresh) {
      // Dedupe across components by marking in-flight for a brief window
      try { sessionStorage.setItem('sck_bootstrap_refresh_inflight', '1'); } catch { /* ignore */ }
      startedRef.current = true;
      // Fire and forget; SessionManager will maintain thereafter
      dispatch(refreshAccessToken('bootstrap'));
    }
  }, [dispatch, tokens, location]);

  // Clear inflight marker after a refresh completes or fails
  useEffect(() => {
    const onDone = () => {
      try { sessionStorage.removeItem('sck_bootstrap_refresh_inflight'); } catch { /* ignore */ }
    };
    window.addEventListener('sck:tokenRefreshed', onDone as EventListener);
    window.addEventListener('sck:tokenRefreshFailed', onDone as EventListener);
    return () => {
      window.removeEventListener('sck:tokenRefreshed', onDone as EventListener);
      window.removeEventListener('sck:tokenRefreshFailed', onDone as EventListener);
    };
  }, []);

  return null;
}
