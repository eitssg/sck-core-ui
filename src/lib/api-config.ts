// Avoid importing the Redux store here to prevent circular deps.
// We'll accept a lazy selector registered by the store at startup.
type TokenSelector = () => { access_token?: string } | null;
let tokenSelector: TokenSelector | null = null;
export function registerTokenSelector(fn: TokenSelector) {
  tokenSelector = fn;
}

const DEBUG_AUTH = Boolean((import.meta as any)?.env?.VITE_DEBUG);

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090',

  // OAuth Configuration
  OAUTH: {
    CLIENT_ID: import.meta.env.VITE_OAUTH_CLIENT_ID || '',
  // Prefer explicit env; otherwise leave empty so getRedirectUri() derives from current origin
  REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI || '',
    SCOPE: import.meta.env.VITE_OAUTH_SCOPE || 'read:profile write:profile',
  CLIENT_SECRET: (import.meta as any)?.env?.VITE_OAUTH_CLIENT_SECRET || '',
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
  SIGNUP: '/auth/v1/signup',
      LOGOUT: '/auth/v1/logout',
      ME: '/auth/v1/me',
  ORGANIZATIONS: '/auth/v1/organizations',
      FORGOT_PASSWORD: '/auth/v1/forgot',
  VERIFY: '/auth/v1/verify',
      VERIFY_SECRET: '/auth/v1/verify-secret',
      UPDATE_PASSWORD: '/auth/v1/password',
  MFA_VERIFY: '/auth/v1/mfa/verify',
      GITHUB_LOGIN: '/auth/github/login',
      GITHUB_CALLBACK: '/auth/github/callback',
    },

    // API endpoints
    API: {
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
  const isDev = (import.meta as any)?.env?.DEV || (import.meta as any)?.env?.MODE === 'development';
  const bypassProxy = String((import.meta as any)?.env?.VITE_BYPASS_VITE_PROXY || 'false') === 'true';
  // In dev, use same-origin (Vite proxy) unless explicitly bypassed
  if (isDev && !bypassProxy && (endpoint.startsWith('/api') || endpoint.startsWith('/auth'))) {
    return `${window.location.origin}${endpoint}`;
  }
  // Otherwise, use BASE_URL
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build OAuth authorize URL
export const getRedirectUri = (): string => {
  // Prefer configured redirect URI; otherwise derive from current origin + optional base path
  const basePath = (import.meta as any)?.env?.VITE_BASE_PATH || '';
  const normalizedBase = basePath ? (basePath.startsWith('/') ? basePath : `/${basePath}`) : '';
  const derivedRedirect = `${window.location.origin}${normalizedBase}/authorized`;
  return API_CONFIG.OAUTH.REDIRECT_URI || derivedRedirect;
};

// PKCE helpers (RFC 7636)
async function sha256(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateCodeVerifier(): string {
  // 32 bytes -> 43+ chars base64url, within 43-128 limit
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier);
  return base64UrlEncode(hash);
}

export const buildOAuthAuthorizeUrl = async (state?: string): Promise<string> => {
  // Generate state if not provided
  let finalState = state;
  try {
    if (!finalState) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      finalState = `st:${hex}`;
    }
    // Persist expected state for validation after redirect
    sessionStorage.setItem('oauth_expected_state', finalState);
  } catch {
    // ignore state generation errors; proceed without state if unavailable
  }

  // PKCE: generate verifier and challenge (S256)
  let codeChallenge: string | undefined;
  let codeVerifier: string | undefined;
  try {
    codeVerifier = generateCodeVerifier();
    codeChallenge = await generateCodeChallenge(codeVerifier);
    // Persist verifier in sessionStorage (both generic and state-keyed for safety)
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    if (finalState) sessionStorage.setItem(`pkce_code_verifier_${finalState}`, codeVerifier);
    if (DEBUG_AUTH) {
      // Do not log sensitive material; only presence
      console.log('[auth] PKCE prepared for authorize URL', {
        hasCodeChallenge: Boolean(codeChallenge),
        method: 'S256',
        hasState: Boolean(finalState),
      });
    }
  } catch {
    // If crypto not available, proceed without PKCE (server may reject for public clients)
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: API_CONFIG.OAUTH.CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: API_CONFIG.OAUTH.SCOPE,
    ...(finalState && { state: finalState }),
    ...(codeChallenge && { code_challenge: codeChallenge, code_challenge_method: 'S256' }),
  } as Record<string, string>);

  return `${buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.AUTHORIZE)}?${params.toString()}`;
};

// Helper function for auth headers
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Read access token from Redux store (in-memory) only
  try {
  const accessToken = tokenSelector ? tokenSelector()?.access_token : undefined;
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  } catch {
    // no-op: omit Authorization if state not available
  }

  // No fallback to storage: access tokens must remain in-memory only.

  return headers;

};
