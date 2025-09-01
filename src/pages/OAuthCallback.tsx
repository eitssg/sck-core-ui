import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * OAuth Callback Handler
 * Handles the OAuth authorization code callback at /authorized
 * This route is separate from /auth/* API endpoints to avoid conflicts
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setError(`OAuth error: ${error}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        const result = await authAPI.exchangeCodeForTokens(code, state || undefined);
        
        if (result.error || !result.user) {
          setError(result.error || 'Login failed');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Update auth context
        if (result.tokens?.access_token) {
          await login(result.tokens.access_token);
        }

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        setError('Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Authentication Error</h2>
          <p className="mt-2">{error}</p>
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold">Completing Sign In...</h2>
        <div className="mt-4 animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  );
}
