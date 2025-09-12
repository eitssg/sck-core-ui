# SCK Core UI – Auth, Session, Storage README

This README captures the working agreements and design constraints for authentication, session, and storage in sck-core-ui. It is the canonical reference for future contributors.

## Principles

- Dual token architecture:
  - Session token (cookie) for `/auth/v1/**` only.
  - Access token (Bearer) for `/api/v1/**` only.
- Access token stays in Redux memory only. Never persisted to storage.
- Refresh token lives in `sessionStorage` only to enable recovery after reload.
- No tokens in `localStorage`. Use `localStorage` only for non-secret preferences and cross-tab signals.

## What happens on reload?

- Access token is intentionally lost. On protected routes, the app recovers a fresh access token via `/auth/v1/token` (grant_type=refresh_token) using the `refresh_token` from sessionStorage.
- Session cookie remains valid and may be rotated proactively by the client based on server headers or heuristics.

## Where do things live?

- Redux memory:
  - access_token, its expiry, and auth state.
  - domain data: clients, portfolios, applications, deployments, zones, etc.
- sessionStorage:
  - refresh_token only (and ephemeral timing metadata such as issued_at or scheduler state; no secrets beyond the refresh token).
- localStorage:
  - durable, non-secret preferences such as `sck.selectedClient` (current tenant) and optional `sck.profileName`.
  - can be used for cross-tab broadcast reasons/flags when appropriate.

## Timers and scheduling

- Access token refresh is scheduled slightly before expiration (leeway configurable).
- Session cookie refresh uses server-provided timing headers when available:
  - `X-Session-Exp`, `X-Session-Refresh-Threshold`.
- Fallback heuristics exist if headers are absent.
- Optional: auto-refresh on API 401 can be feature-flagged.

## Idle and logout

- Idle timeout: 10 minutes without user activity triggers logout.
- Logout always:
  - POSTs `/auth/v1/logout` with credentials to clear the cookie server-side.
  - Clears Redux auth state and both storages.
  - Redirects to `/login` and broadcasts logout across tabs.

## Developer do/don't

- DO keep access tokens only in Redux memory.
- DO place refresh tokens only in sessionStorage.
- DO use `/auth/v1/token` refresh to recover access tokens after reload.
- DO store current client and select UI prefs in localStorage when useful.
- DON'T read/write tokens to localStorage.
- DON'T send cookies for `/api/v1/**` calls; always Bearer only.

## Quick FAQ

- Q: Why not persist access token?  
  A: XSS risk. Losing the in-memory token on reload reduces exposure. Recovery is handled via refresh.

- Q: What if refresh_token is missing?  
  A: User will be treated as logged-out and sent to login.

- Q: Can we read access token from sessionStorage as a fallback?  
  A: No. Access tokens must never be stored in any Web Storage.

- Q: Should we keep portfolio/client caches in storage?  
  A: No. Keep in Redux; use sessionStorage only as a last-resort diagnostic or ephemeral scheduling metadata.

---

This README is intended to remain in sync with the implementation. If anything changes in code, update this document accordingly.
