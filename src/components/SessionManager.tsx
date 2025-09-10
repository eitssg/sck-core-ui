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
  const plannedFireAtRef = useRef<number | null>(null);
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
  let issuedAt = Number(sessionStorage.getItem('session_issued_at') || '0');
  if (!issuedAt) {
    // Backfill: treat current moment as start of session window if refresh_token present
    try {
      if (rtoken) {
        issuedAt = Date.now();
        sessionStorage.setItem('session_issued_at', String(issuedAt));
      }
    } catch { /* ignore */ }
  }
    const sessionWindowMs = sessionWindowMinutes * 60 * 1000;
    const sessionRefreshAtMs = sessionRefreshAtMinutes * 60 * 1000;
  let sessionDueMs = Number.POSITIVE_INFINITY;
    if (issuedAt > 0) {
      const sessionTarget = issuedAt + sessionRefreshAtMs;
      sessionDueMs = Math.max(0, sessionTarget - nowMs);
    }

    // Desired delay is min(accessDueMs, sessionDueMs) respecting minimum
    const rawDelay = Math.min(accessDueMs, sessionDueMs);
    const delay = Math.max(minScheduleMs, rawDelay);

    const targetAt = Date.now() + delay;
    // Idempotent: if existing plan within 10s window of new plan and timer active, skip reschedule
    if (plannedFireAtRef.current && refreshTimerRef.current) {
      const drift = Math.abs(plannedFireAtRef.current - targetAt);
      if (drift <= 10_000) {
        try {
          const now = Date.now();
          const firesInMs = Math.max(0, (plannedFireAtRef.current - now));
          console.log('[sck:auth:schedule]', {
            unchanged: true,
            next_fire_in_s: Math.round(firesInMs / 1000),
            next_fire_at: new Date(plannedFireAtRef.current).toISOString(),
            reason: 'within_drift_window',
            tokens_present: !!token,
          });
        } catch { /* no-op */ }
        return;
      }
    }

    // Clear existing timer before scheduling new one
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = undefined;
    }
    plannedFireAtRef.current = targetAt;
    try {
      sessionStorage.setItem('sck_schedule_next_fire_at', String(targetAt));
      sessionStorage.setItem('sck_schedule_created_at', String(nowMs));
      sessionStorage.setItem('sck_schedule_delay_ms', String(delay));
    } catch { /* ignore persist errors */ }

    try {
      const nowIso = new Date(nowMs).toISOString();
      const accessExpAt = new Date(nowMs + accessDueMs + refreshLeewayMs).toISOString();
      const accessTokenExpMs = nowMs + accessDueMs + refreshLeewayMs;
      const sessionIssuedNum = Number(sessionStorage.getItem('session_issued_at') || '0');
      const sessionIssuedIso = sessionIssuedNum ? new Date(sessionIssuedNum).toISOString() : null;
      const sessionExpiresAtNum = sessionIssuedNum ? (sessionIssuedNum + (sessionWindowMinutes * 60 * 1000)) : 0;
      const sessionExpiresAtIso = sessionExpiresAtNum ? new Date(sessionExpiresAtNum).toISOString() : null;
      const accessIssuedIso = sessionStorage.getItem('access_issued_at');
      const refreshIssuedIso = sessionStorage.getItem('refresh_issued_at');

      // Structured diagnostic object
      console.log('[sck:auth:schedule]', {
  scheduled_in_s: Math.round(delay / 1000), // backward compat
  scheduled_at: new Date(targetAt).toISOString(), // backward compat
  timer_next_fire_at: new Date(targetAt).toISOString(),
  timer_next_fire_in_s: Math.round(delay / 1000),
        now: nowIso,
        reason: 'new_schedule',
        tokens: {
          access: {
            issued_at: accessIssuedIso,
            expires_in_s: typeof tokens?.expires_in === 'number' ? tokens.expires_in : null,
            expires_at: (claims.exp ? new Date(claims.exp * 1000).toISOString() : (tokens?.expires_at ? new Date(tokens.expires_at).toISOString() : null)),
            next_refresh_in_s: Math.round(accessDueMs / 1000),
            next_refresh_at: new Date(nowMs + accessDueMs).toISOString(),
            leeway_s: Math.round(refreshLeewayMs / 1000),
          },
          session: sessionIssuedIso ? {
            issued_at: sessionIssuedIso,
            expires_in_s: sessionIssuedNum ? Math.round((sessionExpiresAtNum - nowMs) / 1000) : null,
            expires_at: sessionExpiresAtIso,
            next_refresh_in_s: isFinite(sessionDueMs) ? Math.round(sessionDueMs / 1000) : null,
            next_refresh_at: isFinite(sessionDueMs) ? new Date(nowMs + sessionDueMs).toISOString() : null,
            window_minutes: sessionWindowMinutes,
            refresh_at_minutes: sessionRefreshAtMinutes,
          } : null,
          refresh: refreshIssuedIso ? {
            issued_at: refreshIssuedIso,
            // We usually don't know refresh token expiry client-side; omit
            expires_in_s: null,
            expires_at: null,
            next_refresh_in_s: Math.round(accessDueMs / 1000),
            next_refresh_at: new Date(nowMs + accessDueMs).toISOString(),
          } : null,
        },
        selection: sessionDueMs <= accessDueMs ? 'session_then_access' : 'access_only',
        raw: {
          accessDueMs,
          sessionDueMs: isFinite(sessionDueMs) ? sessionDueMs : null,
          delayMs: delay,
        }
      });
    } catch { /* ignore */ }

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
  // Clear persisted schedule since we're executing it now; a new schedule will be computed after refresh
  try {
    sessionStorage.removeItem('sck_schedule_next_fire_at');
    sessionStorage.removeItem('sck_schedule_created_at');
    sessionStorage.removeItem('sck_schedule_delay_ms');
  } catch { /* ignore */ }
  plannedFireAtRef.current = null; // consuming
      try {
        // If session refresh is due sooner or equal, do it first (cookie-only)
        const doSessionFirst = sessionDueMs <= accessDueMs;
  if (doSessionFirst && Number(sessionStorage.getItem('session_issued_at') || '0') > 0) {
          // Respect idleness: if user has been idle beyond refresh threshold, let cookie expire
          const idleMs = Date.now() - lastActivityRef.current;
          const maxIdleBeforeRefreshMs = (sessionRefreshAtMinutes - 1) * 60 * 1000; // user must have interacted recently (~within refresh window)
          if (idleMs <= Math.max(0, maxIdleBeforeRefreshMs)) {
            console.log('[session] refreshing session cookie');
            const ok = await authAPI.refreshSession();
      if (ok) {
              // give the backend a brief moment to persist/rotate cookies before hitting /token
              try { console.log('[session] session cookie refreshed, waiting briefly before token refresh'); } catch (e) { /* no-op */ }
              try {
                sessionStorage.removeItem('sck_schedule_next_fire_at');
                sessionStorage.removeItem('sck_schedule_created_at');
                sessionStorage.removeItem('sck_schedule_delay_ms');
        sessionStorage.setItem('session_issued_at', Date.now().toString());
              } catch { /* ignore */ }
              await new Promise((r) => setTimeout(r, 150));
            }
          } else {
            console.log(
              `[session] skipped session cookie refresh due to idle (${Math.round(idleMs / 1000)}s idle > ` +
                `${Math.round(Math.max(0, maxIdleBeforeRefreshMs) / 1000)}s threshold)`
            );
          }
        }

      // Recompute current timing to decide if access token is actually due
      const afterSessionNow = Date.now();
      const liveToken = getAccessToken();
      const liveClaims = liveToken ? decodeJwtClaims(liveToken) : null;
      let accessExpMs = 0;
      if (typeof tokens?.expires_at === 'number' && tokens.expires_at > 0) accessExpMs = tokens.expires_at;
      else if (liveClaims?.exp) accessExpMs = liveClaims.exp * 1000;
  const accessDueNowMs = accessExpMs ? Math.max(0, accessExpMs - refreshLeewayMs - afterSessionNow) : Number.POSITIVE_INFINITY;
      const shouldRefreshAccess = accessDueNowMs === 0;
      if (shouldRefreshAccess) {
        const action = await dispatch(refreshAccessToken('timer_refresh'));
        const fireLog: any = { action: 'access_refresh_attempt', due_ms: accessDueNowMs };
        if (refreshAccessToken.rejected.match(action)) {
          fireLog.status = 'failed_transient';
          console.log('[sck:auth:fire]', fireLog);
          scheduleProactiveRefresh();
          return;
        } else {
          const payload = action.payload as any;
          currentTokenRef.current = payload?.access_token || getAccessToken();
          fireLog.status = 'succeeded';
          console.log('[sck:auth:fire]', fireLog);
          try {
            sessionStorage.removeItem('sck_schedule_next_fire_at');
            sessionStorage.removeItem('sck_schedule_created_at');
            sessionStorage.removeItem('sck_schedule_delay_ms');
          } catch { /* ignore */ }
        }
      } else {
        console.log('[sck:auth:fire]', { action: 'no_access_refresh_needed', remaining_before_leeway_s: Math.round(accessDueNowMs / 1000) });
      }
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
  // Intentionally excluding location.pathname to avoid rescheduling on route changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshLeewayMs, sessionRefreshAtMinutes, sessionWindowMinutes, dispatch, navigate, tokens, getAccessToken, getRefreshToken]);

  useEffect(() => {
    // Initial schedule only
    lastActivityRef.current = Date.now();
    try { if (sessionStorage.getItem('oauth_processing') === '1') return; } catch { /* ignore */ }
    let hasRefresh = false;
    try { hasRefresh = Boolean(sessionStorage.getItem('refresh_token')); } catch { /* ignore */ }
    if (!hasRefresh) return;
    // Attempt restore of persisted schedule
    let restored = false;
    try {
      const nextAtStr = sessionStorage.getItem('sck_schedule_next_fire_at');
      const createdAtStr = sessionStorage.getItem('sck_schedule_created_at');
      const delayStr = sessionStorage.getItem('sck_schedule_delay_ms');
      if (nextAtStr && createdAtStr && delayStr) {
        const nextAt = Number(nextAtStr);
        const createdAt = Number(createdAtStr);
        const origDelay = Number(delayStr);
        const now = Date.now();
        const remaining = nextAt - now;
        const maxStaleWindowMs = 5 * 60 * 1000; // if page reload took >5m, recompute
  const minRemainingMs = 5_000;
  const nearExpiryThresholdMs = 4_000; // if less than this, just recompute
  const stale = (now - createdAt) >= maxStaleWindowMs;
  if (!stale && remaining > minRemainingMs && remaining >= nearExpiryThresholdMs && remaining < origDelay + 5_000) {
          // Recreate timer directly
          plannedFireAtRef.current = nextAt;
          refreshTimerRef.current = window.setTimeout(() => {
            // we just scheduleProactiveRefresh to reuse logic (will clear persisted keys itself on execution)
            scheduleProactiveRefresh();
          }, remaining);
          try {
            const token = getAccessToken();
            const claims = token ? decodeJwtClaims(token) : null;
            const nowMs = Date.now();
            const accessExpMs = claims?.exp ? claims.exp * 1000 : (tokens?.expires_at || 0);
            const accessDueMs = accessExpMs ? Math.max(0, accessExpMs - refreshLeewayMs - nowMs) : null;
            const sessionIssuedNum = Number(sessionStorage.getItem('session_issued_at') || '0');
            const sessionRefreshAtMinutes = Number((import.meta as any)?.env?.VITE_SESSION_REFRESH_AT_MINUTES ?? Math.max(0, (Number((import.meta as any)?.env?.VITE_SESSION_WINDOW_MINUTES ?? 30) - 5)));
            const sessionRefreshAtMs = sessionRefreshAtMinutes * 60 * 1000;
            let sessionDueMs: number | null = null;
            if (sessionIssuedNum) {
              sessionDueMs = Math.max(0, (sessionIssuedNum + sessionRefreshAtMs) - nowMs);
            }
            const selection = (sessionDueMs !== null && accessDueMs !== null) ? (sessionDueMs <= accessDueMs ? 'session_then_access' : 'access_only') : (accessDueMs !== null ? 'access_only' : 'unknown');
            console.log('[sck:auth:schedule]', {
              restored: true,
              remaining_s: Math.round(remaining/1000),
              next_fire_at: new Date(nextAt).toISOString(), // backward compat
              timer_next_fire_at: new Date(nextAt).toISOString(),
              timer_next_fire_in_s: Math.round(remaining/1000),
              selection,
              tokens: {
                access: accessDueMs !== null ? {
                  issued_at: sessionStorage.getItem('access_issued_at') || null,
                  expires_at: accessExpMs ? new Date(accessExpMs).toISOString() : null,
                  next_refresh_in_s: accessDueMs !== null ? Math.round(accessDueMs/1000) : null,
                  next_refresh_at: accessDueMs !== null ? new Date(nowMs + accessDueMs).toISOString() : null,
                  leeway_s: Math.round(refreshLeewayMs/1000)
                } : null,
                session: sessionDueMs !== null ? {
                  issued_at: sessionIssuedNum ? new Date(sessionIssuedNum).toISOString() : null,
                  next_refresh_in_s: Math.round(sessionDueMs/1000),
                  next_refresh_at: new Date(nowMs + sessionDueMs).toISOString(),
                } : null
              },
              raw: {
                accessDueMs,
                sessionDueMs,
                restoredRemainingMs: remaining,
              }
            });
          } catch {
            console.log('[sck:auth:schedule]', { restored: true, remaining_s: Math.round(remaining/1000), next_fire_at: new Date(nextAt).toISOString() });
          }
          restored = true;
        }
      }
    } catch { /* ignore */ }
    if (!restored) scheduleProactiveRefresh();
    // Do NOT depend on pathname to avoid rescheduling on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  let hasRefresh = false;
  try { hasRefresh = Boolean(sessionStorage.getItem('refresh_token')); } catch { /* ignore */ }
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
