import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasSession = (() => {
    if (typeof window === 'undefined') return false;
    try {
      // Treat session cookie as source of truth; we can't read it directly, so use a session flag set at login
      const flag = localStorage.getItem('sck_logged_in') || sessionStorage.getItem('sck_logged_in');
      if (flag === '1') return true;
      // Back-compat: if tokens exist, also allow
      return Boolean(localStorage.getItem('access_token') || localStorage.getItem('token'));
    } catch {
      return false;
    }
  })();

  if (loading) {
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

  // If we have a session (cookie likely set) but user isn't hydrated yet due to
  // a transient /me error, allow access and let downstream components recover.
  if (!user && hasSession) {
    return <>{children}</>;
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};