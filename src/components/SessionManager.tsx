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
 * - Optionally POSTs /auth/v1/refresh (sliding window) to rotate session cookie while the app is active.
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
  const sessionRefreshAtMinutesEnv = Number((import.meta as any)?.env?.VITE_SESSION_REFRESH_AT_MINUTES ?? Math.max(0, (sessionWindowMinutes - 5)));
  // Dynamic refresh-at minutes: if backend supplies X-Session-Refresh-After (epoch ms), convert into minutes remaining
  const computeRefreshAtMinutes = () => {
    try {
      const refreshAfterStr = sessionStorage.getItem('sck_session_refresh_after');
      const sessionExpStr = sessionStorage.getItem('sck_session_expires_at');
      if (refreshAfterStr && sessionExpStr) {
        const now = Date.now();
        const refreshAfter = Number(refreshAfterStr);
        const sessionExp = Number(sessionExpStr);
        if (refreshAfter > 0 && sessionExp > refreshAfter) {
          // Return a pseudo refresh-at minutes = (refreshAfter - (sessionExp - window)) / 60k not precise; just schedule based on epoch directly later.
          // We'll actually use epoch scheduling; this value is only for diagnostics.
          return Math.max(1, Math.round((refreshAfter - now) / 60000));
        }
      }
    } catch { /* ignore */ }
    return sessionRefreshAtMinutesEnv;
  };
  const sessionRefreshAtMinutes = computeRefreshAtMinutes();
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
  if (!token || !rtoken) {
    try { console.log('[sck:auth:schedule:skip]', { reason: 'missing_token_or_refresh', has_access: !!token, has_refresh: !!rtoken }); } catch { /* ignore */ }
    return; // nothing to schedule
  }
  const claims = decodeJwtClaims(token) || {};
  if (!claims.exp && !tokens?.expires_at) {
    try { console.log('[sck:auth:schedule:skip]', { reason: 'no_exp_claim', has_claim_exp: !!claims.exp, has_tokens_expires_at: !!tokens?.expires_at }); } catch { /* ignore */ }
    return; // cannot schedule without exp
  }

  const nowMs = Date.now();
  const expMsFromJwt = claims.exp ? claims.exp * 1000 : 0;
  // Prefer authoritative header-based access exp if present
  const expMs = (typeof tokens?.expires_at === 'number' && tokens!.expires_at! > 0 ? tokens!.expires_at! : expMsFromJwt);
    try {
      // Diagnostic: compare access token exp vs session age window
      const issuedAtStr = sessionStorage.getItem('session_issued_at');
      const sessionIssuedNum = issuedAtStr ? Number(issuedAtStr) : 0;
      const sessionExpHeader = Number(sessionStorage.getItem('sck_session_expires_at') || '0');
      const refreshAfterHeader = Number(sessionStorage.getItem('sck_session_refresh_after') || '0');
      if (sessionIssuedNum && expMs) {
        const now = Date.now();
        const accessRemaining = expMs - now;
        const sessionElapsed = now - sessionIssuedNum;
        console.log('[sck:auth:diag]', {
          access_remaining_s: Math.round(accessRemaining/1000),
          session_elapsed_s: Math.round(sessionElapsed/1000),
          session_window_min: sessionWindowMinutes,
          access_leeway_s: Math.round(refreshLeewayMs/1000),
          source: {
            access_exp_from: (typeof tokens?.expires_at === 'number' && tokens.expires_at > 0) ? 'oauth_expires_at_field_or_claim' : (claims.exp ? 'jwt_claim' : 'unknown'),
            session_exp_source: sessionExpHeader ? 'header' : 'heuristic',
            session_refresh_after_source: refreshAfterHeader ? 'header' : 'heuristic'
          }
        });
      }
    } catch { /* ignore diag errors */ }

    // Compute access-refresh due
  const accessDueMs = Math.max(0, expMs - refreshLeewayMs - nowMs);

    // Compute session-refresh due based on issued at + configured window
  // New session scheduling: derive from backend-provided epochs if available
  let sessionDueMs = Number.POSITIVE_INFINITY;
  const sessionExpHdr = (() => { try { return Number(sessionStorage.getItem('sck_session_expires_at') || ''); } catch { return 0; } })();
  const sessionRefreshAfterHdr = (() => { try { return Number(sessionStorage.getItem('sck_session_refresh_after') || ''); } catch { return 0; } })();
  if (sessionExpHdr > 0 && sessionRefreshAfterHdr > 0) {
    // If we're already past refreshAfter but before exp, schedule immediate (minScheduleMs)
    if (nowMs >= sessionRefreshAfterHdr && nowMs < sessionExpHdr) {
      sessionDueMs = 0;
    } else if (nowMs < sessionRefreshAfterHdr) {
      sessionDueMs = Math.max(0, sessionRefreshAfterHdr - nowMs);
    } else {
      // past expiry or invalid window
      sessionDueMs = 0;
    }
  } else {
    // Fallback legacy heuristic using issued_at if headers absent
    let issuedAt = Number(sessionStorage.getItem('session_issued_at') || '0');
    if (!issuedAt) {
      try { if (rtoken) { issuedAt = Date.now(); sessionStorage.setItem('session_issued_at', String(issuedAt)); } } catch { /* ignore */ }
    }
    if (issuedAt > 0) {
      const sessionRefreshAtMs = sessionRefreshAtMinutes * 60 * 1000;
      const sessionTarget = issuedAt + sessionRefreshAtMs;
      sessionDueMs = Math.max(0, sessionTarget - nowMs);
    }
  }

    // Desired delay is min(accessDueMs, sessionDueMs)
    let rawDelay = Math.min(accessDueMs, sessionDueMs);
    // Guard: if this is an initial schedule (no existing timer) and rawDelay === 0 but token just issued recently,
    // push delay to at least (exp - leeway) boundary instead of firing instantly.
    if (!refreshTimerRef.current && rawDelay === 0) {
      const issuedStr = sessionStorage.getItem('access_issued_at');
      const issuedNum = issuedStr ? Number(issuedStr) : Date.now();
      const ageMs = Date.now() - issuedNum;
      // If age < 5s, treat as freshly issued and defer to minScheduleMs
      if (ageMs < 5000) {
        try { console.log('[sck:auth:adjust]', { reason: 'fresh_token_defer', age_ms: ageMs }); } catch { /* ignore */ }
        rawDelay = minScheduleMs; // small deferral; subsequent scheduling will normalize
      }
    }
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

    // Clear existing timer before scheduling new one (log diagnostic)
    if (refreshTimerRef.current) {
      try {
        const existingFiresIn = plannedFireAtRef.current ? Math.max(0, plannedFireAtRef.current - Date.now()) : null;
        console.log('[sck:auth:timer_reset]', {
          reason: 'reschedule',
          clearing_existing: true,
          existing_fire_in_s: existingFiresIn !== null ? Math.round(existingFiresIn / 1000) : null,
          existing_fire_at: plannedFireAtRef.current ? new Date(plannedFireAtRef.current).toISOString() : null,
        });
      } catch { /* ignore */ }
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = undefined;
    } else {
      try {
        console.log('[sck:auth:timer_reset]', { reason: 'new_timer', clearing_existing: false });
      } catch { /* ignore */ }
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
  const sessionExpiresAtHeaderNum = sessionExpHdr || 0;
  const sessionExpiresAtIso = sessionExpiresAtHeaderNum ? new Date(sessionExpiresAtHeaderNum).toISOString() : (sessionIssuedNum ? new Date(sessionIssuedNum + (sessionWindowMinutes * 60 * 1000)).toISOString() : null);
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
            expires_in_s: sessionExpiresAtIso ? Math.round(((sessionExpHdr || (sessionIssuedNum + (sessionWindowMinutes * 60 * 1000))) - nowMs) / 1000) : null,
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
      try {
        console.log('[sck:auth:timer_fire]', {
          planned_fire_at: plannedFireAtRef.current ? new Date(plannedFireAtRef.current).toISOString() : null,
          firing_at: new Date().toISOString(),
        });
      } catch { /* ignore */ }
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
            // Derive session issuance / expiry details for logging (lazy compute)
            let _sessionIssuedNum = 0; let _sessionIssuedIso: string | null = null; let _sessionExpiresAtIso: string | null = null;
            try {
              _sessionIssuedNum = Number(sessionStorage.getItem('session_issued_at') || '0');
              if (_sessionIssuedNum) {
                _sessionIssuedIso = new Date(_sessionIssuedNum).toISOString();
                const _sessionExpiresAtNum = _sessionIssuedNum + (sessionWindowMinutes * 60 * 1000);
                _sessionExpiresAtIso = new Date(_sessionExpiresAtNum).toISOString();
              }
            } catch { /* ignore */ }
            console.log('[session] refreshing session cookie', {
              issued_at: _sessionIssuedIso,
              expires_at: _sessionExpiresAtIso,
              refresh_at_minutes: sessionRefreshAtMinutes,
              window_minutes: sessionWindowMinutes,
            });
            const ok = await authAPI.refreshSession();
      if (ok) {
              try { sessionStorage.setItem('session_issued_at', Date.now().toString()); } catch { /* ignore */ }
              // give the backend a brief moment to persist/rotate cookies before hitting /token
              try { console.log('[session] session cookie refreshed, waiting briefly before token refresh'); } catch (e) { /* no-op */ }
              try {
                sessionStorage.removeItem('sck_schedule_next_fire_at');
                sessionStorage.removeItem('sck_schedule_created_at');
                sessionStorage.removeItem('sck_schedule_delay_ms');
              } catch { /* ignore */ }
              await new Promise((r) => setTimeout(r, 150));
            } else {
              // If backend lacks endpoint (404) or refresh failed transiently, just proceed to access token logic.
              try { console.log('[session] session cookie refresh skipped or unsupported'); } catch { /* ignore */ }
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
          try {
            const newToken = (action as any)?.payload?.access_token;
            const newClaims = newToken ? decodeJwtClaims(newToken) : null;
            fireLog.new_access_exp_at = newClaims?.exp ? new Date(newClaims.exp * 1000).toISOString() : null;
            fireLog.new_access_issued_at = sessionStorage.getItem('access_issued_at') || null;
          } catch { /* ignore */ }
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
        const sessionExpHdrNow = (() => { try { return Number(sessionStorage.getItem('sck_session_expires_at') || ''); } catch { return 0; } })();
        const cookieExpired = sessionExpHdrNow > 0 ? now >= sessionExpHdrNow : (issuedAt > 0 ? (now - issuedAt) >= (sessionWindowMinutes * 60 * 1000) : false);
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

        // NEW BEHAVIOR: Always logout on refresh failure if tokens are missing or refresh endpoint invalidated
        const stillToken = getAccessToken();
        const stillRefresh = getRefreshToken();
        const reason = !stillRefresh ? 'missing_refresh_token' : (!stillToken ? 'missing_access_token' : 'refresh_failure');
        try {
          console.log('[session] forcing logout after refresh failure', {
            reason,
            cookieExpired,
            accessExpired,
            idle_s: Math.round(idleMs/1000),
            idle_threshold_s: Math.round(Math.max(0, maxIdleBeforeRefreshMs)/1000),
          });
        } catch { /* ignore */ }
        try { await dispatch(logoutUser()).unwrap(); } catch { /* ignore */ }
        const path = location.pathname;
        const isAuthFlow = path.startsWith('/authorized') || path.startsWith('/login') || path.startsWith('/signup');
        if (!isAuthFlow) navigate('/login?reason=session_refresh_failed', { replace: true });
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
    if (!restored) {
      try { console.log('[sck:auth:init]', { action: 'initial_schedule_attempt' }); } catch { /* ignore */ }
      scheduleProactiveRefresh();
    }
    // Do NOT depend on pathname to avoid rescheduling on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Schedule when tokens first become available or change access token reference
  useEffect(() => {
    if (!tokens?.access_token) return;
    try { console.log('[sck:auth:tokens]', { event: 'tokens_updated', have_access: !!tokens?.access_token, expires_at: tokens?.expires_at || null }); } catch { /* ignore */ }
    scheduleProactiveRefresh();
  }, [tokens?.access_token, tokens?.expires_at, scheduleProactiveRefresh]);

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
