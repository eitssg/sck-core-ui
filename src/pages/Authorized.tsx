import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';
import { useAuth } from '@/contexts/useAuth';
import { useReduxData } from '@/hooks/useReduxData';
import { setError } from '@/store/slices/authSlice';

export default function Authorized() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useReduxData();
  const [isProcessing, setIsProcessing] = useState(true);
  const { login } = useAuth();
  const processingRef = useRef(false);

  useEffect(() => {
    const processOAuthCallback = async () => {
  // Mark that we're in the middle of OAuth processing to avoid any hard logout side-effects
  sessionStorage.setItem('oauth_processing', '1');
      // Guard against double-invocation (React StrictMode, rapid re-renders)
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        // Extract authorization code from URL
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          dispatch(setError(error));
          navigate('/login');
          return;
        }

        if (!code) {
          dispatch(setError('No authorization code received'));
          navigate('/login');
          return;
        }

        console.log('Processing OAuth callback with code:', code);

        // Idempotency guard: if we've already exchanged this exact code, skip token call
        const consumeKey = `oauth_code_consumed:${code}`;
        if (sessionStorage.getItem(consumeKey) === 'true') {
          console.log('OAuth code already consumed. Skipping duplicate token exchange.');
          navigate('/dashboard', { replace: true });
          return;
        }
        // Mark as consumed up front to block a second /token call on remounts
        sessionStorage.setItem(consumeKey, 'true');

        // Exchange code for tokens
        const result = await authAPI.handleOAuthCallback(code);

        if ('error' in result) {
          const msg = result.error_description || result.error || 'Login failed';
          dispatch(setError(msg));
          navigate('/login');
          return;
  } else if ('access_token' in result) {
          console.log('OAuth login successful, redirecting to dashboard');
          try {
            localStorage.setItem('sck_logged_in', '1');
            sessionStorage.setItem('sck_logged_in', '1');
          } catch (e) {
            console.warn('Failed to set login session flag', e);
          }
          // Avoid duplicate profile fetch if token already stored
          try {
            const existing = localStorage.getItem('access_token');
            if (existing !== result.access_token) {
              await login(result.access_token);
            }
          } catch (e) {
            // If profile fetch fails, still proceed; ProtectedRoute may bounce back
            console.warn('Post-login profile fetch failed; proceeding to dashboard', e);
          }
          navigate('/dashboard', { replace: true });
        } else {
          dispatch(setError('Login failed - unexpected response'));
          navigate('/login');
          return;
        }

      } catch (error) {
        console.error('OAuth callback processing error:', error);
        dispatch(setError('Failed to process OAuth callback'));
        navigate('/login');
        return;
      } finally {
  sessionStorage.removeItem('oauth_processing');
        setIsProcessing(false);
      }
    };

  processOAuthCallback();
  }, [searchParams, navigate, dispatch, login]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
    <p>Logging in... Please wait...</p>
        </div>
      </div>
    );
  }
  // If not processing, we've navigated away already
  return null;
}