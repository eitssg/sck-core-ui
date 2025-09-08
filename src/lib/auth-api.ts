// Custom authentication API service
import { API_CONFIG, buildApiUrl, buildOAuthAuthorizeUrl, getAuthHeaders, getRedirectUri } from './api-config';
// Enable debug logs if VITE_DEBUG=true for the active mode
declare const __BUILD_MODE__: string | undefined;
const DEBUG_AUTH = Boolean((import.meta as any)?.env?.VITE_DEBUG);
// Surface Vite env diagnostics early
try {
  const envObj = ((import.meta as any)?.env ?? {}) as Record<string, any>;
  const keys = Object.keys(envObj).filter((k) => k === 'MODE' || k.startsWith('VITE_'));
  const modeFromVite = envObj.MODE || (envObj.DEV ? 'development' : envObj.PROD ? 'production' : undefined);
  const modeFromDefine = typeof __BUILD_MODE__ !== 'undefined' ? __BUILD_MODE__ : undefined;
  const modeFromNode = typeof process !== 'undefined' ? (process.env?.NODE_ENV as string | undefined) : undefined;
  const resolvedMode = modeFromVite || modeFromDefine || modeFromNode || 'unknown';
  console.log('[authAPI] Vite env keys present:', keys);
  console.log('[authAPI] Mode:', resolvedMode);
} catch {
  // ignore env diagnostics errors
}
import type {
  SignupRequest,
  OAuthTokenResponse,
  OAuthTokenRequest,
  OAuthErrorResponse,
  LoginResponse,
} from './auth-types';

// NOTE: This module adheres strictly to types defined in auth-types.ts.

function mapOAuthErrorToUserMessage(error: string, statusCode?: number): string {
  // Handle OAuth-specific errors with user-friendly messages
  const lowerError = error.toLowerCase();

  if (lowerError.includes('invalid_redirect_uri') || lowerError.includes('redirect_uri not registered')) {
    return 'Login service configuration error. Please contact support.';
  }

  if (lowerError.includes('invalid_client') || lowerError.includes('client not found')) {
    return 'Application configuration error. Please contact support.';
  }

  if (lowerError.includes('invalid_grant') || lowerError.includes('authorization code')) {
    return 'Login session expired. Please try logging in again.';
  }

  if (lowerError.includes('access_denied')) {
    return 'Access denied. Please check your credentials and try again.';
  }

  if (lowerError.includes('unauthorized') || statusCode === 401) {
    return 'Invalid email or password. Please check your credentials.';
  }

  if (lowerError.includes('invalid_scope')) {
    return 'Permission error. Please contact support.';
  }

  if (lowerError.includes('server_error') || statusCode === 500) {
    return 'Server error. Please try again in a few moments.';
  }

  if (lowerError.includes('temporarily_unavailable') || lowerError.includes('service unavailable')) {
    return 'Login service temporarily unavailable. Please try again in a few moments.';
  }

  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return 'Network connection error. Please check your internet connection.';
  }

  // Default fallback for unknown errors
  return 'Login failed. Please try again or contact support if the problem persists.';
}

function extractTokenPayload(json: any): { token: string | null; token_type: string } {
  // Try a few common shapes: { data: { token } }, { data: { reset_token } }, { token }, { reset_token }
  const d = json?.data ?? json ?? {};
  const token = d.token || d.reset_token || json?.token || json?.reset_token || null;
  const token_type = d.token_type || json?.token_type || 'Bearer';
  return { token, token_type };
}

export const authAPI = {
  // Resolve client secret from multiple sources in a consistent order
  _resolveClientSecret(): string | undefined {
    const configSecret = (API_CONFIG as any)?.OAUTH?.CLIENT_SECRET as string | undefined;
    const viteEnvSecret = (import.meta as any)?.env?.VITE_OAUTH_CLIENT_SECRET as string | undefined;
    const winSecret = (globalThis as any)?.__SCK_ENV__?.VITE_OAUTH_CLIENT_SECRET as string | undefined;
    const lsSecret = (typeof localStorage !== 'undefined') ? (localStorage.getItem('VITE_OAUTH_CLIENT_SECRET') || undefined) : undefined;
    return configSecret || viteEnvSecret || winSecret || lsSecret;
  },

  // Build HTTP Basic header for confidential clients, if secret is provided
  _getBasicAuthHeader(): string | undefined {
    const clientId = API_CONFIG.OAUTH.CLIENT_ID;
    // Prefer API_CONFIG (build-time), then Vite env, then window.__SCK_ENV__, then localStorage
    const configSecret = (API_CONFIG as any)?.OAUTH?.CLIENT_SECRET as string | undefined;
    const viteEnvSecret = (import.meta as any)?.env?.VITE_OAUTH_CLIENT_SECRET as string | undefined;
    const winSecret = (globalThis as any)?.__SCK_ENV__?.VITE_OAUTH_CLIENT_SECRET as string | undefined;
    const lsSecret = (typeof localStorage !== 'undefined') ? (localStorage.getItem('VITE_OAUTH_CLIENT_SECRET') || undefined) : undefined;
    const clientSecret = this._resolveClientSecret();
    if (!clientId || !clientSecret) {
      if (DEBUG_AUTH) {
        console.log('[authAPI] Basic auth not set: clientId?', Boolean(clientId), 'secret?', Boolean(clientSecret));
        console.log('[authAPI] Secret sources -> config:', Boolean(configSecret), 'viteEnv:', Boolean(viteEnvSecret), 'window.__SCK_ENV__:', Boolean(winSecret), 'localStorage:', Boolean(lsSecret));
      }
      return undefined;
    }
    try {
      const raw = `${clientId}:${clientSecret}`;
      // Robust base64 for arbitrary unicode
      const utf8 = new TextEncoder().encode(raw);
      let binary = '';
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      const enc = btoa(binary);
      return `Basic ${enc}`;
    } catch {
      if (DEBUG_AUTH) {
        console.log('[authAPI] Failed to build Basic auth header');
      }
      return undefined;
    }
  },

  // Standard email/password login - returns session credential response
  async login(email: string, password: string): Promise<LoginResponse | OAuthErrorResponse> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email,
          password,
          client_id: API_CONFIG.OAUTH.CLIENT_ID
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.message || errorData.error || 'invalid_request';
        const mapped = mapOAuthErrorToUserMessage(message, response.status);
        return { error: message, error_description: mapped } as OAuthErrorResponse;
      }
      const loginData: LoginResponse = await response.json();
      return loginData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network_error';
      const mapped = mapOAuthErrorToUserMessage(message);
      return { error: message, error_description: mapped } as OAuthErrorResponse;
    }
  },

  // Handle OAuth callback from /authorized page - PROPER OAuth token exchange
  async handleOAuthCallback(code: string): Promise<OAuthTokenResponse | OAuthErrorResponse> {
    try {
      console.log('Step 3: Exchanging authorization code for access token');
      console.log('[authAPI] Checks before /token:', {
        hasClientId: Boolean(API_CONFIG.OAUTH.CLIENT_ID),
  hasSecret: Boolean(this._resolveClientSecret()),
      });

      // STANDARD OAUTH: application/x-www-form-urlencoded
      const tokenRequest = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
        redirect_uri: getRedirectUri(),
      });

      console.log('Token exchange request:', {
        grant_type: 'authorization_code',
        code: code.substring(0, 10) + '...',
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
        redirect_uri: API_CONFIG.OAUTH.REDIRECT_URI,
      });

      const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',  // STANDARD OAUTH
      };
      const basic = this._getBasicAuthHeader();
  if (basic) tokenHeaders['Authorization'] = basic;
  console.log('[authAPI] Will send Authorization header?', Boolean(tokenHeaders['Authorization']));
      if (DEBUG_AUTH) {
        console.log('[authAPI] /token headers (form):', {
          hasAuthorization: Boolean(tokenHeaders['Authorization']),
          authScheme: tokenHeaders['Authorization']?.split(' ')[0] || null,
          contentType: tokenHeaders['Content-Type']
        });
        console.log('[authAPI] Env hints:', {
          hasClientId: Boolean(API_CONFIG.OAUTH.CLIENT_ID),
          hasSecret: Boolean(this._resolveClientSecret()),
          baseUrl: API_CONFIG.BASE_URL,
        });
      }

  const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: tokenHeaders,
        body: tokenRequest.toString(),  // STANDARD OAUTH format
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || 'invalid_request';
        const mapped = mapOAuthErrorToUserMessage(errorData.error_description || message, response.status);
        return { error: message, error_description: mapped } as OAuthErrorResponse;
      }

      const tokens: OAuthTokenResponse = await response.json();
      console.log('Access tokens received');

      // Store tokens
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
      if (typeof (tokens as any)?.expires_in === 'number') {
        const expAt = Date.now() + Number((tokens as any).expires_in) * 1000;
        localStorage.setItem('access_expires_at', String(expAt));
      } else {
        localStorage.removeItem('access_expires_at');
      }

      // Mark session issuance time (cookie set during auth flow)
      localStorage.setItem('session_issued_at', String(Date.now()));

      // Clean up session storage
      sessionStorage.removeItem('oauth_session_token');
      sessionStorage.removeItem('oauth_token_type');

      return tokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network_error';
      const mapped = mapOAuthErrorToUserMessage(message);
      return { error: message, error_description: mapped } as OAuthErrorResponse;
    }
  },

  // OAuth Authorization Code Flow - Step 1: Redirect to authorize
  initiateOAuthLogin(state?: string): void {
    const authorizeUrl = buildOAuthAuthorizeUrl(state);
    window.location.href = authorizeUrl;
  },

  // Alternate Step 1: Call /authorize with Bearer session token and follow 302 manually
  async authorizeWithSession(sessionToken: string, tokenType: string = 'Bearer', state?: string): Promise<void> {
    const authorizeUrl = buildOAuthAuthorizeUrl(state);
    try {
      if (DEBUG_AUTH) {
        console.log('Step 2: Calling /authorize with session token (Bearer) ...');
      }

      const resp = await fetch(authorizeUrl, {
        method: 'GET',
        headers: {
          Authorization: `${tokenType || 'Bearer'} ${sessionToken}`,
        },
        // So we can get Location header and redirect explicitly
        redirect: 'manual' as RequestRedirect,
        credentials: 'include',
      });

      const location = (resp.headers && (resp.headers.get('Location') || resp.headers.get('location'))) || '';
      if (DEBUG_AUTH) {
        console.log('Authorize response:', resp.status, location);
      }

      if (resp.status >= 300 && resp.status < 400 && location) {
        window.location.href = location;
        return;
      }

      // Fallback: navigate directly (cookies may suffice)
      window.location.href = authorizeUrl;
    } catch (err) {
      if (DEBUG_AUTH) {
        console.error('Authorize with session failed, falling back to direct redirect', err);
      }
      window.location.href = authorizeUrl;
    }
  },

  // OAuth Authorization Code Flow - Step 2: Exchange code for tokens
  async exchangeCodeForTokens(code: string, state?: string): Promise<OAuthTokenResponse | OAuthErrorResponse> {
    try {
      // RFC 6749: application/x-www-form-urlencoded request
      const form = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
        redirect_uri: getRedirectUri(),
      });

      console.log('Token exchange request:', { grant_type: 'authorization_code', code: code.substring(0, 10) + '...', client_id: API_CONFIG.OAUTH.CLIENT_ID, redirect_uri: getRedirectUri() });
      console.log('[authAPI] Checks before /token (form):', {
        hasClientId: Boolean(API_CONFIG.OAUTH.CLIENT_ID),
        hasSecret: Boolean((import.meta as any)?.env?.VITE_OAUTH_CLIENT_SECRET),
      });

      const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      const basic = this._getBasicAuthHeader();
      if (basic) tokenHeaders['Authorization'] = basic;
      console.log('[authAPI] Will send Authorization header (form)?', Boolean(tokenHeaders['Authorization']));
      if (DEBUG_AUTH) {
        console.log('[authAPI] /token headers (form exchange):', {
          hasAuthorization: Boolean(tokenHeaders['Authorization']),
          authScheme: tokenHeaders['Authorization']?.split(' ')[0] || null,
          contentType: tokenHeaders['Content-Type']
        });
      }

  const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: tokenHeaders,
        body: form.toString(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || 'invalid_request';
        const mapped = mapOAuthErrorToUserMessage(errorData.error_description || message, response.status);
        return { error: message, error_description: mapped } as OAuthErrorResponse;
      }

  const tokens: OAuthTokenResponse = await response.json();
      console.log('Access tokens received');

      // Store tokens
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
      if (typeof (tokens as any)?.expires_in === 'number') {
        const expAt = Date.now() + Number((tokens as any).expires_in) * 1000;
        localStorage.setItem('access_expires_at', String(expAt));
      } else {
        localStorage.removeItem('access_expires_at');
      }

      // Mark session issuance time (cookie set during auth flow)
      localStorage.setItem('session_issued_at', String(Date.now()));

      return tokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network_error';
      const mapped = mapOAuthErrorToUserMessage(message);
      return { error: message, error_description: mapped } as OAuthErrorResponse;
    }
  },

  // Refresh access token using refresh token; optional state is appended for observability/flows
  async refreshToken(stateParam?: string): Promise<OAuthTokenResponse | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // RFC 6749: application/x-www-form-urlencoded for token endpoint
      const form = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
      });
      if (stateParam) {
        form.append('state', stateParam);
      }

      const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      const basic = this._getBasicAuthHeader();
      if (basic) tokenHeaders['Authorization'] = basic;
      if (DEBUG_AUTH) {
        console.log('[authAPI] /token headers (refresh, form):', {
          hasAuthorization: Boolean(tokenHeaders['Authorization']),
          authScheme: tokenHeaders['Authorization']?.split(' ')[0] || null,
          contentType: tokenHeaders['Content-Type']
        });
        if (stateParam) console.log('[authAPI] refreshToken: appended state param', stateParam);
      }

      // Start request (log minimal diagnostics pre/post)
  try { if (DEBUG_AUTH) console.log('[authAPI] refreshToken: requesting /token (grant_type=refresh_token)'); } catch (e) { /* no-op */ }
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: tokenHeaders,
        body: form.toString(),
        credentials: 'include',
      });

      if (!response.ok) {
  try { if (DEBUG_AUTH) console.log('[authAPI] refreshToken: non-OK status', response.status); } catch (e) { /* no-op */ }
        // Only clear tokens on 401/invalid refresh; keep tokens on transient errors
        if (response.status === 401) {
          // Don't auto-logout on 401; just signal invalid refresh
          throw new Error('invalid_refresh_token');
        }
        return null;
      }

      const tokens: OAuthTokenResponse = await response.json();

      // Store new tokens
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
      if (typeof (tokens as any)?.expires_in === 'number') {
        const expAt = Date.now() + Number((tokens as any).expires_in) * 1000;
        localStorage.setItem('access_expires_at', String(expAt));
      } else {
        localStorage.removeItem('access_expires_at');
      }

  // Log success for observability
  try { console.log('api bearer token refreshed'); } catch (e) { /* noop */ }

      return tokens;
    } catch (error) {
      // If backend explicitly indicated invalid refresh token, propagate
      if (error instanceof Error && error.message === 'invalid_refresh_token') {
        throw error;
      }
      // Network or other errors: do not clear tokens; allow caller to retry later
  try { console.warn('Token refresh transient failure:', error); } catch (e) { /* no-op */ }
      return null;
    }
  },

  // Rotate the session cookie before it expires; cookie-first GET
  async refreshSession(): Promise<boolean> {
    try {
  try { if (DEBUG_AUTH) console.log('[authAPI] refreshSession: calling /auth/v1/refresh'); } catch (e) { /* no-op */ }
      const res = await fetch(buildApiUrl('/auth/v1/refresh'), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
  try { console.log('[authAPI] refreshSession: non-OK status', res.status); } catch (e) { /* no-op */ }
        return false;
      }
      // Mark new session issuance time so scheduling can proceed
      localStorage.setItem('session_issued_at', String(Date.now()));
      try { console.log('session cookie refreshed'); } catch (e) { /* noop */ }
      return true;
    } catch {
      return false;
    }
  },

  // Update signup to include client_id
  async signup(userData: SignupRequest): Promise<OAuthTokenResponse | OAuthErrorResponse> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...userData,
          client_id: API_CONFIG.OAUTH.CLIENT_ID  // Add client_id for signup
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || 'invalid_request';
        return { error: message, error_description: mapOAuthErrorToUserMessage(message, response.status) } as OAuthErrorResponse;
      }

      const data: OAuthTokenResponse = await response.json();

      // Store tokens if provided
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network_error';
      return { error: message, error_description: mapOAuthErrorToUserMessage(message) } as OAuthErrorResponse;
    }
  },

  async logout(): Promise<void> {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        // Revoke token on server
        await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.REVOKE), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ token: accessToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
  // Always clear local storage completely
  try { localStorage.clear(); } catch { /* ignore */ }
    }
  },

  async getCurrentUser(): Promise<import('./auth-types').UserProfile | OAuthErrorResponse> {
    try {
  const token = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!token || !refresh) {
        return { error: 'not_authenticated', error_description: 'User is not authenticated' } as OAuthErrorResponse;
      }

      const user = await this.fetchUserProfile();
      if ((user as any)?.error) {
        // Try to refresh token
        const newTokens = await this.refreshToken();
        if (newTokens) {
          // Retry with new token
          const retryUser = await this.fetchUserProfile();
          return (retryUser as any)?.error ? ({ error: 'profile_fetch_failed' } as OAuthErrorResponse) : retryUser;
        }
        return { error: 'profile_fetch_failed' } as OAuthErrorResponse;
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return { error: 'unknown_error' } as OAuthErrorResponse;
    }
  },

  async githubLogin(): Promise<void> {
    // Redirect to GitHub OAuth endpoint
    window.location.href = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.GITHUB_LOGIN);
  },

  // Update forgot password to include client_id and normalize response shape
  forgotPassword: async (email: string) => {
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // no auth required
        body: JSON.stringify({
          email,
          client_id: API_CONFIG.OAUTH.CLIENT_ID,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || 'Failed to start password reset';
        return { error: msg };
      }

      const { token, token_type } = extractTokenPayload(json);
      return { data: { token, token_type, raw: json } };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  verifyResetCode: async (code: string, token: string) => {
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.VERIFY_SECRET), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || 'Invalid or expired code';
        return { error: msg };
      }

      // Some backends rotate the token after verify
      const { token: nextToken, token_type } = extractTokenPayload(json);
      return { message: json?.message || 'Verified', token: nextToken || token, token_type };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  updatePassword: async (token: string, tokenType: string, newPassword: string) => {
    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.UPDATE_PASSWORD), {
        method: 'PUT',
        headers: {
          'Authorization': `${tokenType || 'Bearer'} ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || 'Failed to update password';
        return { error: msg };
      }
      return json;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  fetchUserProfile: async (profileName?: string) => {
    try {
      // Token must exist; otherwise, do not call /me
      const token = localStorage.getItem('access_token');
      if (!token) {
        return { error: 'not_authenticated' };
      }

      // Simple fingerprint to bind cache to token without storing full token again
      const fingerprint = (() => {
        const parts = token.split('.');
        return (parts[2] || token).slice(-12);
      })();

      // TTL config (default 15 minutes)
      const ttlMs = Number((import.meta as any)?.env?.VITE_PROFILE_TTL_MS ?? 15 * 60 * 1000);
      const cached = localStorage.getItem('sck_profile_cache');
      const cachedAt = Number(localStorage.getItem('sck_profile_fetched_at') || '0');
      const cachedFp = localStorage.getItem('sck_profile_token_fp');

      if (cached && cachedFp === fingerprint && (ttlMs <= 0 || (Date.now() - cachedAt) < ttlMs)) {
        try {
          return JSON.parse(cached);
        } catch {
          // fall through to refetch on parse error
        }
      }

      const url = profileName
        ? `${buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME)}?profile=${profileName}`
        : buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);

      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const json = await response.json();
      // Persist cache
      try {
        localStorage.setItem('sck_profile_cache', JSON.stringify(json));
        localStorage.setItem('sck_profile_fetched_at', String(Date.now()));
        localStorage.setItem('sck_profile_token_fp', fingerprint);
      } catch {
        // ignore storage errors
      }
      return json;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Helper method to get current client from JWT token
  getCurrentClient(): string | null {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.client || 'core';
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  },

};