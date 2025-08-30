// Custom authentication API service
import { API_CONFIG, buildApiUrl, buildOAuthAuthorizeUrl, getAuthHeaders } from './api-config';
import type {
  LoginResponse,
  SignupRequest,
  OAuthTokenResponse,
  OAuthTokenRequest,
  UserProfile
} from './auth-types';

export const authAPI = {
  // Standard email/password login
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email,
          password,
          client_id: API_CONFIG.OAUTH.CLIENT_ID  // Add client_id for login
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { user: null, error: errorData.message || `HTTP ${response.status}` };
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
      return { user: null, error: error instanceof Error ? error.message : 'Login failed' };
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

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { user: null, error: errorData.error_description || 'Token exchange failed' };
      }

      const tokens: OAuthTokenResponse = await response.json();

      // Store tokens
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }

      // Fetch user profile with new token
      const userResponse = await this.fetchUserProfile();
      if (userResponse.error) {
        return { user: null, error: userResponse.error };
      }

      return { user: userResponse, tokens };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Token exchange failed' };
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