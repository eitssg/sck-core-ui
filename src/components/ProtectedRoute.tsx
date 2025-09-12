import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store';
import { selectTokens } from '@/store/slices/authSlice';
import { selectUser as selectProfileUser, selectProfileLoading } from '@/store/slices/profileSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Consider session present if we have an in-memory access token (Redux)
  // or a refresh token in sessionStorage (cookie/session-based continuity)
  const tokens = useAppSelector(selectTokens as any) as { access_token?: string } | null;
  const hasAccess = Boolean(tokens && tokens.access_token);
  let hasRefresh = false;
  try { hasRefresh = Boolean(sessionStorage.getItem('refresh_token')); } catch { /* ignore */ }
  const hasSession = hasAccess || hasRefresh;
  // Profile hydration state (Redux is source of truth for user profile)
  const profileUser = useAppSelector(selectProfileUser as any);
  const profileLoading = useAppSelector(selectProfileLoading as any);
  const hasAwsCreds = Boolean((profileUser as any)?.credentials?.AwsCredentials);

  // Short grace window while we may be refreshing access using the refresh token
  // Prevents a redirect bounce to /login during app boot on reload.
  const [waitingForAccess, setWaitingForAccess] = useState<boolean>(hasRefresh && !hasAccess);
  const waitTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // If we have a refresh token but no access token yet, wait briefly
    if (hasRefresh && !hasAccess) {
      setWaitingForAccess(true);
      if (waitTimerRef.current) window.clearTimeout(waitTimerRef.current);
      // If a refresh just happened or is in-flight, give it a tad longer
      let delay = 2500;
      try {
        const lastAt = sessionStorage.getItem('sck_last_refresh_at');
        const inflight = sessionStorage.getItem('sck_bootstrap_refresh_inflight') === '1';
        if (inflight) delay = 3500;
        else if (lastAt && Date.now() - Date.parse(lastAt) < 1500) delay = 1500;
      } catch { /* ignore */ }
      waitTimerRef.current = window.setTimeout(() => setWaitingForAccess(false), delay);
      // Also end early on refresh success/failure events
      const onDone = () => {
        if (waitTimerRef.current) window.clearTimeout(waitTimerRef.current);
        setWaitingForAccess(false);
      };
      window.addEventListener('sck:tokenRefreshed', onDone as EventListener);
      window.addEventListener('sck:tokenRefreshFailed', onDone as EventListener);
      return () => {
        if (waitTimerRef.current) {
          window.clearTimeout(waitTimerRef.current);
          waitTimerRef.current = null;
        }
        window.removeEventListener('sck:tokenRefreshed', onDone as EventListener);
        window.removeEventListener('sck:tokenRefreshFailed', onDone as EventListener);
      };
    }
    // Access present or no refresh token; stop waiting immediately
    setWaitingForAccess(false);
    if (waitTimerRef.current) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  }, [hasRefresh, hasAccess]);

  // Gate rendering until profile is available when we have an access token
  const hydrating = loading || profileLoading || (hasAccess && !profileUser) || waitingForAccess;

  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  // If profile exists (Redux) or auth context user exists, continue
  if (profileUser || user) {
    return <>{children}</>;
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};