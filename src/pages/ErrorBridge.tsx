import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReduxData } from '@/hooks/useReduxData';
import { setError } from '@/store/slices/authSlice';
import { setPendingAuthError } from '@/lib/error-bridge';

// /error page: accepts ?error=<code>&redirect=<path>
// - Stores the error (in both Redux and sessionStorage)
// - Navigates to redirect (default /login) WITHOUT query params
// - Displays nothing during the handoff
export default function ErrorBridge() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch } = useReduxData();

  useEffect(() => {
    const rawCode = params.get('error') || undefined;
    const rawRedirect = params.get('redirect') || '/login';

    // Validate code: short, printable, safe chars only
    const code = (() => {
      if (!rawCode) return undefined;
      const trimmed = String(rawCode).slice(0, 64);
      // Allow a-z, 0-9, underscore, dash only
      return /^[a-z0-9_-]+$/i.test(trimmed) ? trimmed : 'server_error';
    })();

    // Sanitize redirect:
    // - Must be same-origin path starting with '/'
    // - Drop query and hash
    // - Enforce allowlist of public routes to avoid jumping into protected pages directly
    const sanitizeRedirect = (val: string): string => {
      let v = String(val);
      try {
        // Block absolute URLs and protocol-relative URLs
        if (/^([a-z]+:)?\/\//i.test(v)) return '/login';
        // Ensure starts with '/'
        if (!v.startsWith('/')) v = '/' + v;
        // Strip query/hash
        v = v.split('#')[0].split('?')[0] || '/login';
      } catch {
        return '/login';
      }
      // Minimal allowlist of public destinations
      const allowlist = new Set(['/login', '/signup', '/forgot']);
      return allowlist.has(v) ? v : '/login';
    };
    const redirect = sanitizeRedirect(rawRedirect);

    // Persist to sessionStorage to survive logout side-effects on /login mount
    if (code) setPendingAuthError({ code });
    // Also reflect immediately in Redux so UI can show it on hard navigations within SPA
    if (code) dispatch(setError(code));

    // Navigate to the redirect target without error params
    navigate(redirect, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
