# Auth, Session, and Storage Policy (SCK Core UI)

Authoritative reference for how authentication, tokens, timers, and storage work in sck-core-ui. This document exists to keep team alignment and prevent regressions.

## Overview

- Two-token model:
  - Session token (cookie): used only for `/auth/v1/**` endpoints. Managed by the server; refreshed via cookie rotation.
  - Access token (Bearer): used only for `/api/v1/**` endpoints. Kept in Redux memory only.
- Refresh token: stored only in `sessionStorage`, used to recover a new access token after reload/refresh or used to refresh access token and new refresh token via oauth 2.0 strict RFC complient endpoint /auth/v1/token for any reason.
- No tokens are ever stored in `localStorage`.
- Durable UI preferences (non-secrets) can live in `localStorage` (e.g., current client name).
- This is a multi-tenant platform.  
  - a tenant is called 'client'
  - a 'client' is a {slug} for a tenant
  - a 'client' represents an AWS Management Account.  A master payer.  The primary account.  Invoicing Account or cost center.
  - a 'client' is the top level entity and all other records are subordinate or related to the selected client
- A 'profile' is the user information.  A user may have more than one profile for the client.
- The 'base' or 'login' client is named 'core'.  
  - When an /auth API requires 'client' as a paramter, we will, for the time being until we expand later, use the client 'core'.
  - 'core' is the "Automation" client.  This is the group representing the AWS management account or billing account that manages the automation platform (this application) client and server.
- when the application boots or refreshes, it must initialize a user profile and a client list.
- 'core' is ALWAYS part of the clientList.  The 'client list' clientList can never be empty. even if fetching the client list fails, 'core' is always part of the client list.  Note:  'core' WILL be returned in the client list fetch.
- if there is not a saved client name, always default to 'core'.  do not use the first name on the list.  If 'core' is 20th in the list, then 'core' is selected as the default selection if no saved selection is available.  If the saved selection is not in the list, default to core.

## Storage rules

- access_token: Redux memory only. Not persisted to storage.
- refresh_token: `sessionStorage` only (survives reload, cleared on browser close).
- session cookie: HTTP-only secure cookie managed by the server (survives reload, subject to cookie lifetime).
- localStorage: UI prefs and cross-tab signals only. Today:
  - `sck.selectedClient` – the user’s last selected client (tenant) slug.  The last select client should continue to persist after browser restart and remain in local storage
  - `sck.profileName` – reserved for the current profile name if/when needed.  This should pesist across browser restarts and remain in local storage.
- sessionStorage diagnostic keys (non-secrets, ephemeral):
  - `sck_session_expires_at`, `sck_session_refresh_after` (captured from headers)
  - `session_issued_at`, `access_issued_at`, `refresh_issued_at`
  - `sck_schedule_next_fire_at`, `sck_schedule_created_at`, `sck_schedule_delay_ms` (timer persistence)
- expiration information for session cookie expiration information is provided in X-Session-** headers when /auth/v1/login or /auth/v1/refresh execute.
- oauth tokens from /auth/v1/token calculation expiration based on standard "expires_in" oauth response.

## Boot and recovery sequence

- On app load:
  - Public routes: no token bootstrap occurs.
  - Protected routes: TokenBootstrap checks for a `refresh_token` in `sessionStorage`. If present, it invokes `/auth/v1/token` (grant_type=refresh_token, form-encoded, PKCE/Basic as configured) to recover an access token into Redux memory.
  - The access token is never read from storage; if absent, it is recovered via refresh.
- Client hydration:
  - The store hydrates the selected client from `localStorage` key `sck.selectedClient`.
  - Redux slices (e.g., clients/portfolios) then fetch as needed. Use session storage as a last resort only.

## Timers and refresh

- SessionManager is responsible for proactive refresh scheduling:
  - Access token refresh is scheduled to occur slightly before expiry (default leeway: 5 minutes; configurable via `VITE_ACCESS_REFRESH_LEEWAY_MS`).
  - Session cookie refresh uses server-provided headers when available:
    - `X-Session-Exp` (epoch seconds when cookie expires)
    - `X-Session-Refresh-Threshold` (epoch seconds after which rotation is allowed)
  - If headers are not present, a heuristic falls back to `session_issued_at` + `VITE_SESSION_WINDOW_MINUTES` with a refresh-at of `VITE_SESSION_REFRESH_AT_MINUTES`.
  - Tab focus/visibility changes may trigger a near-term refresh check.
  - Optional feature: auto-refresh on API 401 events can be enabled with `VITE_ENABLE_AUTO_REFRESH_ON_401=true`.'
  - Session cookie and session token refresh is handled via `/auth/v1/refresh`.
    - If an HTTP 401 Unauthorized is returned from this endpoint, the session cookie is missing or invalid.
    - The app immediately navigates to `/login?reason=session_expired`, ensuring a clean logout that is handled by the Login page itself.
    - Optionally, the navigation can include a message key similar to the idle timer (e.g., `/login?reason=idle_timeout`).
    - This addresses the edge case where idle timers are paused (sleep) but the session cookie expires in the meantime.

## Idle logout

- Dedicated 10-minute idle timer (mousemove, mousedown, keypress, scroll, touchstart, click reset it).
- On idle timeout:
   - Navigates to `/login?reason=idle_timeout`.
- Login.tsx page on load checks if logged in (refresh token exists, or and redux data that exusts but should cleared cleared after logout or other flag)
  - Login page Calls `/auth/v1/logout` (POST with credentials) to clear the server cookie.
  - Login page Clears both `sessionStorage` and `localStorage`.
  - Broadcasts a cross-tab logout via `BroadcastChannel('sck-auth-sync')`. Verify no race condition exists TabA calls TabB to go to /login and TabB then tells TabA to go to /login
- Any navigation to the /login page should logout the user if the user is logged in. Wheter done by a element signal or by the user typeing /login in the browser url manually.

## Logout behavior (manual or error-driven)

- Always POST `/auth/v1/logout` with `credentials: 'include'` to delete the secure session cookie.
- Clear all storage session storage and and Redux state.  retain local storage.
- Redirect to `/login` with a reason query param where applicable.

## API contract and formats

- `/auth/v1/token` uses OAuth 2.0 Compliant to RFC standards STRING poicy.  OAuth 2.0 form post requirements:  sends `application/x-www-form-urlencoded` with grant types:
  - `authorization_code` (with PKCE `code_verifier` when used)
  - `refresh_token`
- Confidential clients may include HTTP Basic Authorization header (`client_id:client_secret`).
- `/auth/v1/refresh` rotates the session cookie (204 No Content on success) and may emit session headers for client scheduling.
- `/auth/v1/me` requires the session cookie session token.
- `/auth/v1/logout` clears the session cookie.
- `/api/v1/**` endpoints always require Bearer access token; `apiFetch` enforces this and will not fall back to cookies.
- /auth/v1/forgot isses password token to be used in password reset
- /auth/v1/verify-secret requires bearer forgot password token
- /auth/v1/password requires berer forgot password token
- /auth/v1/signup creates a new user with sign-up page

## MFA Login
- If the user has MFA active, the following process occurs
  - /login page calls /auth/v1/login - The cookie set is a "temporary mfa session".  This cookie cannot be used to call any /auth endpoing except the mfa endpoints.  /login responds with 202 and the body has message="mfa_redirect" with a HTTP-only cookie and embedded token of type "mfa_pending".  The cookie lifespan is 5 minutes
  - UI navigates to the 'enter mfa code page'
  - User enters MFA code into the form.  End presses enter submitting the /auth/v1/mfa/verify
  - The server validates the code and responds with HTTP 200 and the real session cookie and the X-Session** expiration information.
  - The login process continues with call to oAuth /authorize to begin generating access token

## API Response

- OAuth 2.0 endpoints /auth/v1/authoorize, /uath/v1/token, or others respond with data body as defined in the standards specification
- Non OAuth 2.0 endpoints in /auth and ALL endpoints in /api respond with data wrapped in response body.  Response body  { "status": "ok", "code": 200, "data": [{ object }] | {object}, "metadata": { object }, "message": "the message", "links": { object }} per the Response object specification or is subclasses which can add fields.  
- the data attribute in response body could be array [] if list of data is expected or a single object {}


## Environment variables (selected)

- `VITE_API_BASE_URL` – base URL for API when bypassing proxy.
- `VITE_BYPASS_VITE_PROXY` – set `true` to bypass dev proxy behavior.
- `VITE_OAUTH_CLIENT_ID`, `VITE_OAUTH_CLIENT_SECRET`, `VITE_OAUTH_REDIRECT_URI`, `VITE_OAUTH_SCOPE`.
- `VITE_ACCESS_REFRESH_LEEWAY_MS` – ms before access expiry to refresh (default: 300000).
- `VITE_SESSION_WINDOW_MINUTES` – total cookie window if headers missing (default: 30).
- `VITE_SESSION_REFRESH_AT_MINUTES` – minute mark to refresh within window if headers missing (default: window-5).
- `VITE_ENABLE_AUTO_REFRESH_ON_401` – optional auto-refresh on API 401.
- `VITE_BASE_PATH` – base path for router when building.

## Security considerations

- Access token never persisted to storage (mitigates XSS token exfiltration).
- Refresh token limited to `sessionStorage` (clears on browser close), minimizing persistence.
- Session cookie is HTTP-only and rotated proactively; scheduler prefers server-provided timing.
- OAuth flows adhere to RFC 6749/7636 (form-encoded, PKCE).

## Keys quick reference

- sessionStorage (ephemeral):
  - `refresh_token`
  - `sck_session_expires_at`, `sck_session_refresh_after`
  - `session_issued_at`, `access_issued_at`, `refresh_issued_at`
  - `sck_schedule_next_fire_at`, `sck_schedule_created_at`, `sck_schedule_delay_ms`
- localStorage (durable, non-secret):
  - `sck.selectedClient`
  - `sck.profileName` (reserved/optional)
  - sidebar menu open/collapsed flag

## Expected behaviors summary

- Reload/refresh: access token is lost by design; recovered via `/auth/v1/token` refresh using `refresh_token` from `sessionStorage`.
- /api requests: always require Bearer; failure emits `sck:api401` and may trigger a refresh if feature-flagged.
- Idle: 10 minutes of inactivity triggers full logout and redirect to `/login`.
- Logout: server cookie cleared, all storage cleared, Redux state reset, cross-tab logout broadcast.

---

This document is normative for sck-core-ui. If behavior deviates, update the implementation or this document to re-align.
