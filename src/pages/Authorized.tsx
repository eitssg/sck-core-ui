import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '@/lib/auth-api';
import { useAuth } from '@/contexts/useAuth';
import { useReduxData } from '@/hooks/useReduxData';
import { setError, setTokens } from '@/store/slices/authSlice';
import { API_CONFIG, buildApiUrl } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';
import { syncFromAuth, normalizeUserProfile } from '@/store/slices/profileSlice';

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
            // Persist tokens in Redux immediately so Authorization header becomes available
            const expires_at = Date.now() + (Number((result as any).expires_in || 0) * 1000);
            dispatch(setTokens({ ...(result as any), expires_at }));
          } catch (e) {
            // non-blocking
          }
          // Mark session active for bootstrap and session manager gating
          try { sessionStorage.setItem('auth_session_active', '1'); } catch { /* ignore */ }
          // No storage flags; rely on Redux and bootstrap flows
          // Hydrate AuthContext using the freshly received in-memory access token
          try {
            await login(result.access_token);
            // Prefer cache set by AuthContext.login() to avoid duplicate /me fetch
            let profileNameForPatch: string | null = null;
            try {
              const cached = localStorage.getItem('sck_profile_cache');
              if (cached) {
                const parsed = JSON.parse(cached);
                try { dispatch(syncFromAuth(normalizeUserProfile(parsed))); } catch (e) { /* non-blocking */ }
                profileNameForPatch = (parsed as any)?.profile_name || null;
              }
            } catch {
              // ignore cache parse errors
            }
            if (!profileNameForPatch) {
              // Fallback to a single profile fetch only if cache was missing
              try {
                const profile = await authAPI.fetchUserProfile();
                try { dispatch(syncFromAuth(normalizeUserProfile(profile))); } catch (e) { /* non-blocking */ }
                profileNameForPatch = (profile as any)?.profile_name || null;
              } catch {
                // ignore; we'll patch with default
              }
            }
            fireLoggedInPatch(profileNameForPatch || 'default');
          } catch (e) {
            // If profile fetch fails, still proceed; ProtectedRoute may bounce back
            console.warn('Post-login profile fetch failed; proceeding to dashboard', e);
            fireLoggedInPatch('default');
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
        // Destroy any storage that references the raw authorization code (no longer valid)
        try {
          const code = searchParams.get('code');
          if (code) sessionStorage.removeItem(`oauth_code_consumed:${code}`);
        } catch { /* ignore */ }
        setIsProcessing(false);
      }
    };

  processOAuthCallback();
  }, [searchParams, navigate, dispatch, login]);

  // Helper: fire-and-forget logged_in patch with profile_name
  async function fireLoggedInPatch(profileName: string = 'default') {
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
      await apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify({ logged_in: true, profile_name: profileName || 'default' }),
      });
    } catch {
      // non-blocking
    }
  }

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