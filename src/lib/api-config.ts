import { store } from '@/store';
import { selectTokens } from '@/store/slices/authSlice';

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090',

  // OAuth Configuration
  OAUTH: {
    CLIENT_ID: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
    REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI || 'http://localhost:8080/authorized',
    SCOPE: import.meta.env.VITE_OAUTH_SCOPE || 'read:profile write:profile',
  },

  // API Endpoints
  ENDPOINTS: {
    // OAuth endpoints
    OAUTH: {
      AUTHORIZE: '/auth/v1/authorize',
      TOKEN: '/auth/v1/token',
      REVOKE: '/auth/v1/revoke',
    },

    // Auth endpoints
    AUTH: {
      LOGIN: '/auth/v1/login',
      LOGOUT: '/auth/v1/logout',
      ME: '/auth/v1/me',
      FORGOT_PASSWORD: '/auth/v1/forgot',
      VERIFY_SECRET: '/auth/v1/verify-secret',
      UPDATE_PASSWORD: '/auth/v1/password',
      GITHUB_LOGIN: '/auth/github/login',
      GITHUB_CALLBACK: '/auth/github/callback',
    },

    // API endpoints
    API: {
      USERS: '/api/v1/users',
      PORTFOLIOS: '/api/v1/portfolios',
      APPLICATIONS: '/api/v1/applications',
      CLIENTS: '/api/v1/clients',
      ZONES: '/api/v1/zones',
      DEPLOYMENTS: '/api/v1/deployments',
    }
  }
} as const;

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build OAuth authorize URL
export const buildOAuthAuthorizeUrl = (state?: string): string => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: API_CONFIG.OAUTH.CLIENT_ID,
    redirect_uri: API_CONFIG.OAUTH.REDIRECT_URI,
    scope: API_CONFIG.OAUTH.SCOPE,
    ...(state && { state }),
  });

  return `${buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.AUTHORIZE)}?${params.toString()}`;
};

// Helper function for auth headers
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Fallback to localStorage for non-React contexts
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;

};
