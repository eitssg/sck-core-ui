// Simple bridge to carry one-shot auth error codes/messages across redirects without using URL params.
// Uses sessionStorage to avoid persistence and survive a page reload once.

const CODE_KEY = 'pending_auth_error_code';
const MSG_KEY = 'pending_auth_error_message';

export function setPendingAuthError(input: { code?: string; message?: string }) {
  try {
    if (input.code) sessionStorage.setItem(CODE_KEY, String(input.code));
    if (input.message) sessionStorage.setItem(MSG_KEY, String(input.message));
  } catch {
    // ignore storage errors
  }
}

export function hasPendingAuthError(): boolean {
  try {
    return Boolean(sessionStorage.getItem(CODE_KEY) || sessionStorage.getItem(MSG_KEY));
  } catch {
    return false;
  }
}

export function consumePendingAuthError(): { code?: string; message?: string } | null {
  try {
    const code = sessionStorage.getItem(CODE_KEY) || undefined;
    const message = sessionStorage.getItem(MSG_KEY) || undefined;
    if (!code && !message) return null;
    if (code) sessionStorage.removeItem(CODE_KEY);
    if (message) sessionStorage.removeItem(MSG_KEY);
    return { code, message };
  } catch {
    return null;
  }
}
