import { useEffect, useRef } from 'react';
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

  useEffect(() => {
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
      startedRef.current = true;
      // Fire and forget; SessionManager will maintain thereafter
      dispatch(refreshAccessToken('bootstrap'));
    }
  }, [dispatch, tokens]);

  return null;
}
