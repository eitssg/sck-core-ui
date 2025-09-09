import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';
import { useAppDispatch, useAppSelector } from '@/store';
import { logoutUser, refreshAccessToken, selectTokens } from '@/store/slices/authSlice';
import type { OAuthTokenResponse } from '@/store/types';

type AuthTokens = OAuthTokenResponse & { expires_at?: number };

/**
 * SessionManager
 * - Listens for global 'sck:api401' events and performs a one-time refresh_token exchange.
 *   Does NOT retry the failed request; only refreshes tokens for subsequent calls.
 *   Controlled by VITE_ENABLE_AUTO_REFRESH_ON_401 (default: false).
 * - Optionally pings /auth/v1/refresh to rotate cookies while the app is active.
 *   Controlled by VITE_ENABLE_COOKIE_REFRESH_PING (default: false) and interval VITE_REFRESH_PING_INTERVAL_MS.
 */
// Minimal JWT decode to read exp claim
function decodeJwtClaims(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const SessionManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const refreshingRef = useRef(false);
  const lastPingRef = useRef(0);
  const refreshTimerRef = useRef<number | undefined>(undefined);
  const currentTokenRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const tokens = useAppSelector(selectTokens as any) as AuthTokens | null;

  const enableAutoRefreshOn401 = String((import.meta as any)?.env?.VITE_ENABLE_AUTO_REFRESH_ON_401 || 'false') === 'true';
  // Session cookie window and access token leeway
  const sessionWindowMinutes = Number((import.meta as any)?.env?.VITE_SESSION_WINDOW_MINUTES ?? 30);
  const sessionRefreshAtMinutes = Number((import.meta as any)?.env?.VITE_SESSION_REFRESH_AT_MINUTES ?? Math.max(0, (sessionWindowMinutes - 5)));
  const refreshLeewayMs = Number((import.meta as any)?.env?.VITE_ACCESS_REFRESH_LEEWAY_MS ?? 5 * 60 * 1000); // refresh 5m before exp by default
  const minScheduleMs = 5_000; // avoid ultra-short loops

  const getAccessToken = useCallback(() => tokens?.access_token || null, [tokens]);
  const getRefreshToken = useCallback(() => {
    try { return sessionStorage.getItem('refresh_token'); } catch { return null; }
  }, []);

  const scheduleProactiveRefresh = useCallback(() => {
  const token = getAccessToken();
  const rtoken = getRefreshToken();
    // Clear any existing timer
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = undefined;
    }
    currentTokenRef.current = token;

  if (!token || !rtoken) return; // nothing to schedule
  const claims = decodeJwtClaims(token) || {};
  if (!claims.exp && !tokens?.expires_at) return; // cannot schedule without exp

  const nowMs = Date.now();
  const expMsFromJwt = claims.exp ? claims.exp * 1000 : 0;
  const expMs = typeof tokens?.expires_at === 'number' && tokens!.expires_at! > 0 ? tokens!.expires_at! : expMsFromJwt;

    // Compute access-refresh due
  const accessDueMs = Math.max(0, expMs - refreshLeewayMs - nowMs);

    // Compute session-refresh due based on issued at + configured window
  const issuedAt = Number(sessionStorage.getItem('session_issued_at') || '0');
    const sessionWindowMs = sessionWindowMinutes * 60 * 1000;
    const sessionRefreshAtMs = sessionRefreshAtMinutes * 60 * 1000;
  let sessionDueMs = Number.POSITIVE_INFINITY;
    if (issuedAt > 0) {
      const sessionTarget = issuedAt + sessionRefreshAtMs;
      sessionDueMs = Math.max(0, sessionTarget - nowMs);
    }

    // If already within or past leeway, refresh ASAP (with a slight delay to batch bursts)
    const delay = Math.max(minScheduleMs, Math.min(accessDueMs, sessionDueMs));

    try {
      const accessAt = new Date(nowMs + accessDueMs).toISOString();
      const sessionAt = isFinite(sessionDueMs) ? new Date(nowMs + sessionDueMs).toISOString() : 'n/a';
      const which = sessionDueMs <= accessDueMs ? 'session-then-access' : 'access';
      // Helpful scheduling log for troubleshooting
      console.log(
        `[session] scheduling ${which} refresh in ${Math.round(delay / 1000)}s ` +
          `(access in ${Math.round(accessDueMs / 1000)}s @ ${accessAt}, ` +
          `session in ${isFinite(sessionDueMs) ? Math.round(sessionDueMs / 1000) + 's @ ' + sessionAt : 'n/a'}, ` +
          `leeway ${Math.round(refreshLeewayMs / 1000)}s)`
      );
    } catch {
      // ignore log errors
    }

    refreshTimerRef.current = window.setTimeout(async () => {
      // Single-flight and recheck token presence
  if (refreshingRef.current) return;
  const stillToken = getAccessToken();
  const stillRefresh = getRefreshToken();
      if (!stillToken || !stillRefresh) return;

      // If token changed since scheduled, reschedule using new token
  if (currentTokenRef.current && stillToken !== currentTokenRef.current) {
        scheduleProactiveRefresh();
        return;
      }

      refreshingRef.current = true;
      try {
        // If session refresh is due sooner or equal, do it first (cookie-only)
        const doSessionFirst = sessionDueMs <= accessDueMs;
        if (doSessionFirst && Number(localStorage.getItem('session_issued_at') || '0') > 0) {
          // Respect idleness: if user has been idle beyond refresh threshold, let cookie expire
          const idleMs = Date.now() - lastActivityRef.current;
          const maxIdleBeforeRefreshMs = (sessionRefreshAtMinutes - 1) * 60 * 1000; // user must have interacted recently (~within refresh window)
          if (idleMs <= Math.max(0, maxIdleBeforeRefreshMs)) {
            console.log('[session] refreshing session cookie');
            const ok = await authAPI.refreshSession();
            if (ok) {
              // give the backend a brief moment to persist/rotate cookies before hitting /token
              try { console.log('[session] session cookie refreshed, waiting briefly before token refresh'); } catch (e) { /* no-op */ }
              await new Promise((r) => setTimeout(r, 150));
            }
          } else {
            console.log(
              `[session] skipped session cookie refresh due to idle (${Math.round(idleMs / 1000)}s idle > ` +
                `${Math.round(Math.max(0, maxIdleBeforeRefreshMs) / 1000)}s threshold)`
            );
          }
        }

  const action = await dispatch(refreshAccessToken('timer_refresh'));
  console.log('[session] proactive access token refresh attempted');
  if (refreshAccessToken.rejected.match(action)) {
          // Transient failure: keep tokens; we’ll try again at next schedule/focus
          console.log('[session] transient failure refreshing access token; will reschedule');
          scheduleProactiveRefresh();
          return;
        }
        // Reschedule with new token
  const payload = action.payload as any;
  currentTokenRef.current = payload?.access_token || getAccessToken();
        console.log('[session] proactive access token refresh succeeded');
        scheduleProactiveRefresh();
        try {
          window.dispatchEvent(new CustomEvent('sck:tokenRefreshed'));
        } catch {
          // no-op
        }
      } catch (err) {
        // Only thrown when refresh token is invalid (explicit 401 from backend)
        // Logout ONLY if (cookie expired OR access token expired) AND user has been idle beyond threshold.
        const now = Date.now();
        const idleMs = now - lastActivityRef.current;
        const maxIdleBeforeRefreshMs = (sessionRefreshAtMinutes - 1) * 60 * 1000; // same threshold as above
  const issuedAt = Number(sessionStorage.getItem('session_issued_at') || '0');
        const sessionWindowMs = sessionWindowMinutes * 60 * 1000;
        const cookieExpired = issuedAt > 0 ? (now - issuedAt) >= sessionWindowMs : false;
        // Check access token expiry (prefer stored, fallback to JWT exp)
        let accessExpired = false;
        try {
          const expStored = typeof tokens?.expires_at === 'number' ? tokens!.expires_at! : 0;
          if (expStored > 0) {
            accessExpired = now >= expStored;
          } else {
            const tk = getAccessToken();
            const claims = tk ? decodeJwtClaims(tk) : null;
            const expMs = claims?.exp ? claims.exp * 1000 : 0;
            accessExpired = expMs > 0 ? now >= expMs : false;
          }
        } catch { /* no-op */ }

        if ((cookieExpired || accessExpired) && idleMs > Math.max(0, maxIdleBeforeRefreshMs)) {
          try {
            console.log('[session] session cookie expired and user idle; logging out');
          } catch { /* no-op */ }
          try { await dispatch(logoutUser()).unwrap(); } catch { /* ignore */ }
          const path = location.pathname;
          const isAuthFlow = path.startsWith('/authorized') || path.startsWith('/login') || path.startsWith('/signup');
          if (!isAuthFlow) navigate('/login?reason=session_expired', { replace: true });
        } else {
          // Active user or cookie not past window: do not auto-logout; reschedule and continue
          try {
            console.log('[session] refresh invalid but user active or window not expired; not logging out');
          } catch { /* no-op */ }
          scheduleProactiveRefresh();
        }
      } finally {
        refreshingRef.current = false;
      }
    }, delay);
  }, [refreshLeewayMs, sessionRefreshAtMinutes, sessionWindowMinutes, dispatch, navigate, location.pathname, tokens, getAccessToken, getRefreshToken]);

  useEffect(() => {
    // Initial schedule and react to navigation (helps right after login)
  lastActivityRef.current = Date.now();
    // Skip while OAuth callback is processing
    try { if (sessionStorage.getItem('oauth_processing') === '1') return; } catch { /* ignore */ }
  // Only run if we have a refresh token available
  let hasRefresh = false;
  try { hasRefresh = Boolean(sessionStorage.getItem('refresh_token')); } catch { /* ignore */ }
  if (!hasRefresh) return;
    scheduleProactiveRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    // React to token updates from other tabs and optional custom events
    const onStorage = (e: StorageEvent) => {
        if (e.key === 'refresh_token') scheduleProactiveRefresh();
      };
    const onTokenRefreshed = () => scheduleProactiveRefresh();
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('sck:tokenRefreshed', onTokenRefreshed as EventListener);
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('click', onActivity);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('sck:tokenRefreshed', onTokenRefreshed as EventListener);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('click', onActivity);
    };
  }, [scheduleProactiveRefresh]);

  useEffect(() => {
    // Sleep/wake or tab focus: check if close to expiry and refresh immediately if needed
    const maybeRefreshSoon = () => {
      // Only when we have a refresh token
      let hasRefresh = false;
      try { hasRefresh = Boolean(sessionStorage.getItem('refresh_token')); } catch { /* ignore */ }
      if (!hasRefresh) return;
  const token = getAccessToken();
  const rtoken = getRefreshToken();
      if (!token || !rtoken) return;
      const claims = decodeJwtClaims(token) || {};
      if (!claims.exp) return;
      const nowMs = Date.now();
      const expMs = claims.exp * 1000;
      if (expMs - nowMs <= refreshLeewayMs) {
        // Trigger immediate schedule (which will refresh soon)
        scheduleProactiveRefresh();
      }
    };

    window.addEventListener('focus', maybeRefreshSoon);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) maybeRefreshSoon();
    });
    return () => {
      window.removeEventListener('focus', maybeRefreshSoon);
      document.removeEventListener('visibilitychange', () => {
        if (!document.hidden) maybeRefreshSoon();
      });
    };
  }, [refreshLeewayMs, scheduleProactiveRefresh, getAccessToken, getRefreshToken]);

  useEffect(() => {
    if (!enableAutoRefreshOn401) return; // feature-flagged off by default

    const onApi401 = async () => {
      if (refreshingRef.current) return; // single-flight
      // Only attempt if we have a refresh_token
      const hasRefresh = Boolean(localStorage.getItem('refresh_token'));
      if (!hasRefresh) return;

      refreshingRef.current = true;
      try {
  const action = await dispatch(refreshAccessToken('timer_refresh'));
  if (refreshAccessToken.rejected.match(action)) {
          // On 401 from an API call, do not auto-logout. Log and leave state as-is.
          try {
            console.log('[session] 401 encountered; refresh failed. Not logging out automatically.');
          } catch { /* no-op */ }
        } else {
          // Broadcast that tokens were refreshed (optional listeners may react)
          try {
            window.dispatchEvent(new CustomEvent('sck:tokenRefreshed'));
          } catch {
            // no-op
          }
        }
      } catch {
        // On unexpected errors, do not auto-logout on 401 path
        try {
          console.log('[session] 401 handler encountered an error; not logging out automatically.');
        } catch { /* no-op */ }
      } finally {
        // small cooldown so bursts of 401s don’t reenter immediately
        setTimeout(() => {
          refreshingRef.current = false;
        }, 1500);
      }
    };

    const handler = () => onApi401();
    window.addEventListener('sck:api401', handler as EventListener);
    return () => window.removeEventListener('sck:api401', handler as EventListener);
  }, [enableAutoRefreshOn401, location.pathname, navigate, dispatch]);

  // Removed global ping; session refresh happens based on window timing above

  return null;
};

export default SessionManager;
