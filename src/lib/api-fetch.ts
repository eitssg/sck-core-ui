import { buildApiUrl, getAuthHeaders } from '@/lib/api-config';

export type ApiFetchOptions = RequestInit & {
  cookieFirst?: boolean; // try without Authorization first then fallback on 401
  dedupeKey?: string;    // key for toast dedupe
  noToast401?: boolean;  // suppress global toast handling
  notify401?: boolean;   // emit a global 401 event for aggregation (default true)
  contextLabel?: string; // human label for the resource (e.g., 'Clients')
  onUnauthorized?: () => void; // caller-specific handler for 401
};

export async function apiFetch(input: string, options: ApiFetchOptions = {}): Promise<Response> {
  const url = input.startsWith('/auth/') || input.startsWith('/api/') ? buildApiUrl(input) : input;
  const cookieFirst = options.cookieFirst === true;

  const doFetch = async (init: RequestInit) => fetch(url, { credentials: 'include', ...init });

  if (cookieFirst) {
    // First attempt: no Authorization header (avoid preflight)
    const res1 = await doFetch({ ...options, headers: { ...(options.headers || {}), Accept: 'application/json' } });
  if (res1.status !== 401) return res1;
    // Fallback with Bearer
  const res2 = await doFetch({ ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } });
  handle401(res2, options);
    return res2;
  }

  // Default: attach Bearer immediately
  const res = await doFetch({ ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } });
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
