// Custom authentication API service
import { API_CONFIG, buildApiUrl, buildOAuthAuthorizeUrl, getAuthHeaders, getRedirectUri } from './api-config';
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

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',  // STANDARD OAUTH
        },
        body: tokenRequest.toString(),  // STANDARD OAUTH format
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

  // OAuth Authorization Code Flow - Step 2: Exchange code for tokens
  async exchangeCodeForTokens(code: string, state?: string): Promise<OAuthTokenResponse | OAuthErrorResponse> {
    try {
      const tokenRequest: OAuthTokenRequest = {
        grant_type: 'authorization_code',
        code,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
  redirect_uri: getRedirectUri(),
      };

      console.log('Token exchange request:', { ...tokenRequest, code: code.substring(0, 10) + '...' });

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequest),
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

      return tokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network_error';
      const mapped = mapOAuthErrorToUserMessage(message);
      return { error: message, error_description: mapped } as OAuthErrorResponse;
    }
  },

  // Refresh access token using refresh token
  async refreshToken(): Promise<OAuthTokenResponse | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const tokenRequest: OAuthTokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
      };

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequest),
      });

      if (!response.ok) {
        // Refresh token is invalid, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return null;
      }

      const tokens: OAuthTokenResponse = await response.json();

      // Store new tokens
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }

      return tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
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
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  async getCurrentUser(): Promise<import('./auth-types').UserProfile | OAuthErrorResponse> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
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
      const url = profileName
        ? `${buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME)}?profile=${profileName}`
        : buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      return await response.json();
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