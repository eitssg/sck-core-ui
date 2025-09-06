import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';
import { useReduxData } from '@/hooks/useReduxData';
import { setError } from '@/store/slices/authSlice';

export default function Authorized() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useReduxData();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
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

        // Exchange code for tokens
        const result = await authAPI.handleOAuthCallback(code);

        if ('error' in result) {
          const msg = result.error_description || result.error || 'Login failed';
          dispatch(setError(msg));
          navigate('/login');
          return;
        } else if ('access_token' in result) {
          console.log('OAuth login successful, redirecting to dashboard');
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
        setIsProcessing(false);
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate, dispatch]);

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