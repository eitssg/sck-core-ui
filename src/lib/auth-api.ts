// Custom authentication API service
import { API_CONFIG, buildApiUrl, buildOAuthAuthorizeUrl, getAuthHeaders } from './api-config';
import type {
  LoginResponse,
  SignupRequest,
  OAuthTokenResponse,
  OAuthTokenRequest,
  UserProfile
} from './auth-types';

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

export const authAPI = {

  // Standard email/password login - now handles OAuth session token flow
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Step 1: Getting session token from /auth/v1/login');

      // Step 1: Get session token from /auth/v1/login (HTTP 200)
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
        const errorData = await response.json();
        const userFriendlyMessage = mapOAuthErrorToUserMessage(
          errorData.message || errorData.error || 'Login failed',
          response.status
        );
        return { user: null, error: userFriendlyMessage };
      }

      const loginData = await response.json();
      console.log('Login response:', loginData);

      // Extract session token from response
      const sessionToken = loginData.data?.token;
      const tokenType = loginData.data?.token_type || 'Bearer';

      if (!sessionToken) {
        return { user: null, error: 'Login service error. Please contact support.' };
      }

      console.log('Step 2: Using session token for OAuth authorize');

      // Step 2: Use the session token for /auth/v1/authorize (with redirect: 'manual')
      const authorizeUrl = buildOAuthAuthorizeUrl();
      const authorizeResponse = await fetch(authorizeUrl, {
        method: 'GET',
        headers: {
          'Authorization': `${tokenType} ${sessionToken}`,  // ✅ Use the session token!
          'Content-Type': 'application/json',
        },
        redirect: 'manual'  // ✅ Handle 302 redirect manually
      });

      // Handle the 302 redirect manually
      if (response.status === 302) {

        const setCookieHeaders = response.headers.get('Set-Cookie');
        if (setCookieHeaders) {
          // Parse and set cookies manually
          const cookies = setCookieHeaders.split(',').map(cookie => cookie.trim());

          cookies.forEach(cookieString => {
            // Extract cookie name=value and attributes
            const [nameValue, ...attributes] = cookieString.split(';');
            const [name, value] = nameValue.split('=');

            if (name.trim() === 'sck_token') {
              // Set the sck_token cookie
              document.cookie = cookieString;
            }
          });
        }

        // This is correct OAuth behavior
        const redirectUrl = response.headers.get('Location');
        if (redirectUrl) {
          // Handle the redirect (e.g., window.location.href = redirectUrl)
          window.location.href = redirectUrl;
          return;
        }
      } else {
        // Only try to parse JSON for non-redirect responses
        if (response.headers.get('content-type')?.includes('application/json')) {
          const data = await response.json();
          // Handle your current error format: {"status": "error", "code": 500, "message": "Unknown Exception"}
          if (!response.ok || data.status === "error") {
            throw new Error(data.message || `HTTP ${response.status}`);
          }
          return data;
        }
      }
    } catch (error) {
      console.error('Login flow error:', error);
      const userFriendlyMessage = mapOAuthErrorToUserMessage(
        error instanceof Error ? error.message : 'Login failed'
      );
      return { user: null, error: userFriendlyMessage };
    }
  },

  // Handle OAuth callback from /authorized page - PROPER OAuth token exchange
  async handleOAuthCallback(code: string): Promise<LoginResponse> {
    try {
      console.log('Step 3: Exchanging authorization code for access token');

      // STANDARD OAUTH: application/x-www-form-urlencoded
      const tokenRequest = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
        redirect_uri: API_CONFIG.OAUTH.REDIRECT_URI,
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
        const errorData = await response.json();
        console.error('Token exchange error:', errorData);

        const userFriendlyMessage = mapOAuthErrorToUserMessage(
          errorData.error_description || errorData.error || errorData.message || 'Token exchange failed',
          response.status
        );
        return { user: null, error: userFriendlyMessage };
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

      // Fetch user profile with new token
      const userResponse = await this.fetchUserProfile();
      if (userResponse.error) {
        return { user: null, error: 'Failed to load user profile. Please try logging in again.' };
      }

      return { user: userResponse, tokens };
    } catch (error) {
      console.error('Token exchange error:', error);
      const userFriendlyMessage = mapOAuthErrorToUserMessage(
        error instanceof Error ? error.message : 'Token exchange failed'
      );
      return { user: null, error: userFriendlyMessage };
    }
  },

  // OAuth Authorization Code Flow - Step 1: Redirect to authorize
  initiateOAuthLogin(state?: string): void {
    const authorizeUrl = buildOAuthAuthorizeUrl(state);
    window.location.href = authorizeUrl;
  },

  // OAuth Authorization Code Flow - Step 2: Exchange code for tokens
  async exchangeCodeForTokens(code: string, state?: string): Promise<LoginResponse> {
    try {
      const tokenRequest: OAuthTokenRequest = {
        grant_type: 'authorization_code',
        code,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
        redirect_uri: API_CONFIG.OAUTH.REDIRECT_URI,
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
        const errorData = await response.json();
        console.error('Token exchange error:', errorData);

        const userFriendlyMessage = mapOAuthErrorToUserMessage(
          errorData.error_description || errorData.error || errorData.message || 'Token exchange failed',
          response.status
        );
        return { user: null, error: userFriendlyMessage };
      }

      const tokens: OAuthTokenResponse = await response.json();
      console.log('Access tokens received');

      // Store tokens
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }

      // Fetch user profile with new token
      const userResponse = await this.fetchUserProfile();
      if (userResponse.error) {
        return { user: null, error: 'Failed to load user profile. Please try logging in again.' };
      }

      return { user: userResponse, tokens };
    } catch (error) {
      console.error('Token exchange error:', error);
      const userFriendlyMessage = mapOAuthErrorToUserMessage(
        error instanceof Error ? error.message : 'Token exchange failed'
      );
      return { user: null, error: userFriendlyMessage };
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
  async signup(userData: SignupRequest): Promise<LoginResponse> {
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
        const errorData = await response.json();
        return { user: null, error: errorData.message || 'Signup failed' };
      }

      const data = await response.json();

      // Store tokens if provided
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      }

      return { user: data.user, tokens: data };
    } catch (error) {
      console.error('Signup error:', error);
      return { user: null, error: 'Network error occurred' };
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

  async getCurrentUser(): Promise<LoginResponse> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return { user: null };
      }

      const user = await this.fetchUserProfile();
      if (user.error) {
        // Try to refresh token
        const newTokens = await this.refreshToken();
        if (newTokens) {
          // Retry with new token
          const retryUser = await this.fetchUserProfile();
          return { user: retryUser.error ? null : retryUser };
        }
        return { user: null };
      }

      return { user };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null };
    }
  },

  async githubLogin(): Promise<void> {
    // Redirect to GitHub OAuth endpoint
    window.location.href = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.GITHUB_LOGIN);
  },

  // Update forgot password to include client_id
  forgotPassword: async (email: string) => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email,
          client_id: API_CONFIG.OAUTH.CLIENT_ID  // Add client_id for password reset
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset code');
      }

      return await response.json();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  verifyResetCode: async (code: string, token: string) => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.VERIFY_SECRET), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // Use the token as Bearer auth
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle different error status codes
        switch (response.status) {
          case 401:
            throw new Error('Unauthorized - token may be invalid or expired');
          case 400:
            throw new Error('Verification code has already been used');
          case 404:
            throw new Error('Verification code not found in database');
          default:
            throw new Error(errorData.message || 'Invalid or expired verification code');
        }
      }

      // 200 response - verification successful
      const data = await response.json();
      return { message: data.message || 'Token verified' };

    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  updatePassword: async (token: string, tokenType: string, newPassword: string) => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.UPDATE_PASSWORD), {
        method: 'PUT',
        headers: {
          'Authorization': `${tokenType} ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword
        }),
      });

      if (!response.ok) {
        // Get the specific error message from the server
        const errorData = await response.json();

        // For 404, add context that this is likely a missing user profile
        if (response.status === 404) {
          return {
            error: errorData.message || 'User profile not found',
            statusCode: 404
          };
        }

        throw new Error(errorData.message || 'Failed to update password');
      }

      // 200 response - success
      return await response.json();
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