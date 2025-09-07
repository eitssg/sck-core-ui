import { buildApiUrl, getAuthHeaders } from '@/lib/api-config';

export type ApiFetchOptions = RequestInit & {
  cookieFirst?: boolean; // try without Authorization first then fallback on 401
  dedupeKey?: string;    // key for toast dedupe
  noToast401?: boolean;  // suppress global toast handling
  notify401?: boolean;   // emit a global 401 event for aggregation (default true)
  contextLabel?: string; // human label for the resource (e.g., 'Clients')
  onUnauthorized?: () => void; // caller-specific handler for 401
  noAuthRetryOn401?: boolean; // when cookieFirst, do not retry with Bearer on 401 (e.g., login)
};

export async function apiFetch(input: string, options: ApiFetchOptions = {}): Promise<Response> {
  // Determine final URL and whether this is an /api request
  const shouldBuild = input.startsWith('/auth/') || input.startsWith('/api/');
  const url = shouldBuild ? buildApiUrl(input) : input;

  // Determine which endpoints require Authorization header
  const requiresAuth = (() => {
    const needs = (p: string) => {
      if (p.startsWith('/api/')) return true; // all /api require Bearer
      // Protected /auth endpoints that require Bearer (post-login)
      return p === '/auth/v1/me' || p === '/auth/v1/logout' || p === '/auth/v1/revoke';
    };
    try {
      // Prefer checking the fully built URL's pathname
      const u = new URL(url);
      return needs(u.pathname);
    } catch {
      // Fallback to raw input heuristic
      return needs(input);
    }
  })();

  // For /api endpoints, we must include Authorization and must NOT use cookie-first fallback
  const cookieFirstRequested = options.cookieFirst === true;
  // For endpoints that require auth, never use cookie-first fallback
  const cookieFirst = requiresAuth ? false : cookieFirstRequested;

  const makeHeaders = () => {
    // Always start from auth headers to pick up Authorization
    const base = getAuthHeaders();
    const combined = { ...base, ...(options.headers || {}) } as Record<string, string>;
    // Ensure Accept for JSON APIs
    if (!('Accept' in combined)) combined['Accept'] = 'application/json';
    return combined;
  };

  // Guard: /api without Authorization is a programmer error
  const headersForApiCheck = makeHeaders();
  const hasAuthHeader = Object.keys(headersForApiCheck).some(k => k.toLowerCase() === 'authorization');
  if (requiresAuth && !hasAuthHeader) {
    throw new Error('Missing access token: this request requires Authorization: Bearer <token>.');
  }

  const doFetch = async (init: RequestInit) => fetch(url, { credentials: 'include', ...init });

  if (cookieFirst) {
    // First attempt: no Authorization header (avoid preflight) – only for /auth
    const res1 = await doFetch({ ...options, headers: { ...(options.headers || {}), Accept: 'application/json' } });
    // NEVER retry on 401
    handle401(res1, options);
    return res1;
  }

  // Default: attach Bearer immediately (mandatory for /api)
  const res = await doFetch({ ...options, headers: makeHeaders() });
  handle401(res, options);
  return res;
}

function handle401(res: Response, options: ApiFetchOptions) {
  if (res.status !== 401) return;
  // Caller hook first
  try {
    options.onUnauthorized?.();
  } catch (e) {
    // ignore user callback errors
  }
  // Emit global aggregation event unless suppressed
  const shouldNotify = options.notify401 !== false && !options.noToast401;
  if (shouldNotify && typeof window !== 'undefined') {
    try {
      const detail = { label: options.contextLabel || 'API', path: extractPathFromUrl(String(res.url || '')) };
      window.dispatchEvent(new CustomEvent('sck:api401', { detail }));
    } catch (e) {
      // ignore event dispatch errors
    }
  }
}

function extractPathFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url;
  }
}
