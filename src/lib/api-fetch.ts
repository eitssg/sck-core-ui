import { buildApiUrl, getAuthHeaders } from '@/lib/api-config';

export type ApiFetchOptions = RequestInit & {
  cookieFirst?: boolean; // try without Authorization first then fallback on 401 (auth endpoints only)
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
    const needs = (p: string) => p.startsWith('/api/'); // only /api requires Bearer
    try {
      const u = new URL(url);
      return needs(u.pathname);
    } catch {
      return needs(input);
    }
  })();

  // Cookie policy: never send cookies to /api; include cookies for /auth
  const credentials: RequestCredentials = (() => {
    try {
      const u = new URL(url);
      return u.pathname.startsWith('/api/') ? 'omit' : 'include';
    } catch {
      return String(input).startsWith('/api/') ? 'omit' : 'include';
    }
  })();

  // For /api endpoints, we must include Authorization and must NOT use cookie-first fallback
  const cookieFirstRequested = (() => {
    if (options.cookieFirst === true) return true;
    if (typeof input !== 'string') return false;
    try {
      // Support both raw path and fully qualified URL; cookie-first for all /auth
      const u = new URL(input, window.location.origin);
      return u.pathname.startsWith('/auth/');
    } catch {
      return input.startsWith('/auth/');
    }
  })();
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

  const doFetch = async (init: RequestInit) => fetch(url, { credentials, ...init });

  if (cookieFirst) {
    // First attempt: cookie-first (session cookie). Keep JSON headers but drop Authorization.
    const baseHeaders = makeHeaders();
    // Remove Authorization while preserving Content-Type and any caller-provided headers
    Object.keys(baseHeaders).forEach((k) => {
      if (k.toLowerCase() === 'authorization') delete (baseHeaders as any)[k];
    });
    const mergedHeaders = { ...baseHeaders, ...(options.headers || {}) } as Record<string, string>;
    if (!('Accept' in mergedHeaders)) mergedHeaders['Accept'] = 'application/json';
    const res1 = await doFetch({ ...options, headers: mergedHeaders });
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
  try {
    const path = extractPathFromUrl(String(res.url || ''));
    if (path.startsWith('/auth/v1/me')) {
      // Force immediate navigation to login; session cookie is invalid/expired and cannot be refreshed
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams({ reason: 'me_unauthorized' });
        try { params.set('returnTo', window.location.pathname + window.location.search); } catch { /* ignore */ }
        window.location.replace(`/login?${params.toString()}`);
      }
    }
  } catch { /* ignore redirect errors */ }
  // Caller hook first
  try {
    options.onUnauthorized?.();
  } catch {
    // ignore user callback errors
  }
  // Emit global aggregation event unless suppressed
  const shouldNotify = options.notify401 !== false && !options.noToast401;
  if (shouldNotify && typeof window !== 'undefined') {
    try {
      const detail = { label: options.contextLabel || 'API', path: extractPathFromUrl(String(res.url || '')) };
      window.dispatchEvent(new CustomEvent('sck:api401', { detail }));
    } catch {
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
