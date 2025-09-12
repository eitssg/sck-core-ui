import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { 
  selectAuth, 
  selectIsAuthenticated, 
  selectTokens,
  refreshAccessToken,
  logoutUser,
  setLogoutReason,
} from '@/store/slices/authSlice';
import { authAPI } from '@/lib/auth-api';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector(selectAuth);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const tokens = useSelector(selectTokens);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const isLoggingOutRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const navigate = useNavigate();

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

  // (Timers removed: centralized scheduling handled exclusively by SessionManager.)

  // Dedicated idle timeout: logs out after 10 minutes of no user interaction
  useEffect(() => {
    if (!isAuthenticated) return;

    const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const IDLE_TIMEOUT_MIN = IDLE_TIMEOUT_MS / 60000;
  const lastActivityRef = { current: Date.now() };

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
      clearIdleTimer();
      bestEffortClearCookies();
      // Do not clear storage or dispatch logout here. Navigate to /login and let the Login page perform unconditional logout.
  try { dispatch(setLogoutReason('idle_timeout')); } catch { /* ignore */ }
  navigate('/login?reason=idle_timeout', { replace: true });
    };

  const resetIdleTimer = () => {
      clearIdleTimer();
      lastActivityRef.current = Date.now();
      idleTimerRef.current = setTimeout(onIdle, IDLE_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => document.addEventListener(event, resetIdleTimer, true));
    resetIdleTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetIdleTimer, true));
      clearIdleTimer();
    };
  }, [isAuthenticated, dispatch, navigate]);

  // Cleanup idle timer on unmount
  useEffect(() => {
    const idleTimer = idleTimerRef.current;
    return () => { if (idleTimer) clearTimeout(idleTimer); };
  }, [dispatch]);

  // Helpers
  const logout = () => {
    isLoggingOutRef.current = true;
    try { bcRef.current?.postMessage({ type: 'auth:logout' }); } catch { /* no-op */ }
    try { sessionStorage.removeItem('refresh_token'); } catch { /* ignore */ }
    try { dispatch(setLogoutReason('manual')); } catch { /* ignore */ }
    dispatch(logoutUser()).finally(() => {
      navigate('/login?reason=manual', { replace: true });
    });
  };

  const forceRefreshToken = () => {
    requestRefresh(makeState('manual'));
  };

  const refreshSessionCookie = async () => {
    try {
      await authAPI.refreshSession();
    } catch (e) {
      const status = (e as any)?.status;
      if (status === 401 || (e instanceof Error && e.message === 'session_cookie_invalid')) {
        try { dispatch(setLogoutReason('session_expired')); } catch { /* ignore */ }
        navigate('/login?reason=session_expired', { replace: true });
        return;
      }
      // otherwise ignore as transient
    }
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
