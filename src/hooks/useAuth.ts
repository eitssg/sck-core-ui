import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { 
  selectAuth, 
  selectIsAuthenticated, 
  selectTokens,
  refreshAccessToken,
  logoutUser,
} from '@/store/slices/authSlice';
import { authAPI } from '@/lib/auth-api';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector(selectAuth);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const tokens = useSelector(selectTokens);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null); // deprecated logic, will not be used
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const isLoggingOutRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  // Small helper to tag refreshes for observability
  const makeState = (prefix: 'auto' | 'manual' = 'auto') => {
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      return `${prefix}:${hex}`;
    } catch {
      return `${prefix}:${Date.now().toString(16)}`;
    }
  };

  // In-flight guarded refresh dispatcher
  const requestRefresh = useCallback((tag?: string) => {
    if (refreshInFlightRef.current || isLoggingOutRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const action = refreshAccessToken(tag);
      const p = dispatch(action) as unknown as Promise<any>;
      p.finally(() => { refreshInFlightRef.current = false; });
    } catch {
      refreshInFlightRef.current = false;
    }
  }, [dispatch]);

  // Cross-tab sync via BroadcastChannel + storage events (logout only)
  useEffect(() => {
    const channelName = 'sck-auth-sync';
    try {
      bcRef.current = new BroadcastChannel(channelName);
    } catch {
      bcRef.current = null;
    }

    const onMessage = (ev: MessageEvent) => {
      const msg = ev.data || {};
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'auth:logout') {
        if (!isLoggingOutRef.current) {
          isLoggingOutRef.current = true;
          dispatch(logoutUser());
        }
      }
    };

    const onStorage = (_e: StorageEvent) => {};

    bcRef.current?.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    return () => {
      bcRef.current?.removeEventListener('message', onMessage);
      try { bcRef.current?.close(); } catch { /* no-op */ }
      window.removeEventListener('storage', onStorage);
    };
  }, [dispatch]);

  // Set up automatic token refresh timer from current tokens
  useEffect(() => {
    if (tokens && isAuthenticated) {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

  const refreshBuffer = 60 * 1000; // 60 seconds before expiry
  // Session window clamp: refresh access token no later than 25 minutes from now
  const SESSION_MAX_MS = 30 * 60 * 1000; // 30 minutes
  const SESSION_REFRESH_MARGIN = 5 * 60 * 1000; // leave 5 minutes margin
  const MAX_WAIT_MS = Math.max(30_000, SESSION_MAX_MS - SESSION_REFRESH_MARGIN); // ~25 minutes
      const now = Date.now();
      const expAt = tokens.expires_at ?? (now + tokens.expires_in * 1000);
      const jitterRange = Number((import.meta as any)?.env?.VITE_REFRESH_JITTER_MS ?? 10_000);
      const rand = Math.random() * 2 - 1; // [-1, 1)
      const jitter = Math.trunc(rand * jitterRange);
  // Base plan: shortly before expiry, with jitter
  let candidateAt = expAt - refreshBuffer + jitter;
  // Do not schedule past token expiry
  candidateAt = Math.min(candidateAt, expAt - 5_000);
  // Do not schedule beyond session window clamp
  candidateAt = Math.min(candidateAt, now + MAX_WAIT_MS);
  // Ensure at least a few seconds from now
  candidateAt = Math.max(candidateAt, now + 5_000);
  const refreshTime = Math.max(0, candidateAt - now);

  const secs = Math.round(refreshTime / 1000);
  const ttlSecs = Math.round((expAt - now) / 1000);
  console.log(`Access token: ttl=${ttlSecs}s, scheduled refresh in ${secs}s (jitter ${jitter}ms, clamp ${Math.round(MAX_WAIT_MS/1000)}s)`);

      refreshTimerRef.current = setTimeout(() => {
        console.log('Access token: auto-refreshing now...');
        requestRefresh(makeState('auto'));
      }, refreshTime);

      return () => {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }
  }, [tokens, isAuthenticated, dispatch, requestRefresh]);

  // Periodic session cookie refresh (every ~25 minutes) while authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      return;
    }

    const SESSION_MAX_MS = 30 * 60 * 1000; // 30 minutes
    const SESSION_REFRESH_EVERY_MS = Math.max(60_000, SESSION_MAX_MS - 5 * 60 * 1000); // ~25 minutes

    const scheduleSessionRefresh = () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = setTimeout(async () => {
        try {
          console.log(`Session: refreshing cookie now (interval ~${Math.round(SESSION_REFRESH_EVERY_MS/1000)}s)`);
          await authAPI.refreshSession();
        } finally {
          scheduleSessionRefresh();
        }
      }, SESSION_REFRESH_EVERY_MS);
      console.log(`Session: refresh scheduled in ${Math.round(SESSION_REFRESH_EVERY_MS/1000)}s`);
    };

    scheduleSessionRefresh();

    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // Dedicated idle timeout: logs out after 10 minutes of no user interaction
  useEffect(() => {
    if (!isAuthenticated) return;

    const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const bestEffortClearCookies = () => {
      try {
        const cookieNames = ['session', 'session_id', 'oauth_state'];
        cookieNames.forEach((name) => {
          document.cookie = `${name}=; Max-Age=0; Path=/;`;
        });
      } catch {
        // ignore
      }
    };

    const onIdle = async () => {
      console.warn('Idle timer: user inactive for 10 minutes, logging out');
      clearIdleTimer();
      bestEffortClearCookies();
      isLoggingOutRef.current = true;
      try { bcRef.current?.postMessage({ type: 'auth:logout' }); } catch { /* no-op */ }
      await dispatch(logoutUser());
    };

    const resetIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = setTimeout(onIdle, IDLE_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => document.addEventListener(event, resetIdleTimer, true));
    resetIdleTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetIdleTimer, true));
      clearIdleTimer();
    };
  }, [isAuthenticated, dispatch]);

  // Cleanup timers on unmount
  useEffect(() => {
    const refreshTimer = refreshTimerRef.current;
    const sessionTimer = sessionTimerRef.current;
    const idleTimer = idleTimerRef.current;
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      if (sessionTimer) {
        clearTimeout(sessionTimer);
      }
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [dispatch]);

  // Helpers
  const logout = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    isLoggingOutRef.current = true;
    try { bcRef.current?.postMessage({ type: 'auth:logout' }); } catch { /* no-op */ }
    try { sessionStorage.removeItem('refresh_token'); } catch { /* ignore */ }
    dispatch(logoutUser());
  };

  const forceRefreshToken = () => {
    requestRefresh(makeState('manual'));
  };

  const refreshSessionCookie = async () => {
    await authAPI.refreshSession();
  };

  return {
    ...auth,
    logout,
    forceRefreshToken,
    refreshSessionCookie,
    getAccessToken: () => tokens?.access_token || null,
    isTokenExpiringSoon: () => {
      if (!tokens?.expires_at) return false;
      const timeUntilExpiry = tokens.expires_at - Date.now();
      return timeUntilExpiry < 5 * 60 * 1000;
    },
  };
};
