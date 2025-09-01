import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';

export default function Authorized() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Extract authorization code from URL
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        if (error) {
          setError(`OAuth error: ${error}`);
          setIsProcessing(false);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setIsProcessing(false);
          return;
        }

        console.log('Processing OAuth callback with code:', code);

        // Exchange code for tokens
        const result = await authAPI.handleOAuthCallback(code);

        if (result.error) {
          setError(result.error);
        } else if (result.user) {
          console.log('OAuth login successful, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          setError('Login failed - no user data received');
        }

      } catch (error) {
        console.error('OAuth callback processing error:', error);
        setError('Failed to process OAuth callback');
      } finally {
        setIsProcessing(false);
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Completing login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="btn btn-primary"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}