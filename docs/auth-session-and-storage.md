---
title: Auth, Session, and Storage Policy (SCK Core UI)
version: 1.0
last_updated: 2025-09-12
purpose: Baseline context for AI-assisted development; canonical auth/session/storage rules for sck-core-ui.
---

# Auth, Session, and Storage Policy (SCK Core UI)

AI context TL;DR
- Two-token model: session cookie for /auth only; bearer access token for /api only (in Redux memory, never persisted).
- Refresh token in sessionStorage only; used to recover access token at boot and refresh it as needed.
- /login is authoritative: any navigation to it triggers full logout (server cookie cleared, sessionStorage + Redux cleared, localStorage retained for UI prefs).
- Client selection: 'core' always present; default to 'core' if none saved or saved not found.
- Route gating: protected pages require in-memory access token; attempt refresh first, else /login?reason=bootstrap_failed.
- Cross-tab: use BroadcastChannel('sck-auth-sync') for auth events; primary message is { type: 'auth:logout' } and optional { type: 'auth:token' }; guard to avoid loops.
- Timers: proactive refresh using server headers when present; idle timeout 10m -> /login?reason=idle_timeout.

Policy contract (machine-readable)
```json
{
  "tokens": {
    "session_cookie": {
      "use": "/auth/**",
      "storage": "httpOnlyCookie",
      "rotate_via": "/auth/v1/refresh"
    },
    "access_token": {
      "use": "/api/**",
      "storage": "reduxMemoryOnly",
      "refresh_via": "/auth/v1/token"
    },
    "refresh_token": {
      "storage": "sessionStorage",
      "key": "refresh_token"
    }
  },
  "storage": {
    "sessionStorage_keys": [
      "refresh_token",
      "sck_session_expires_at",
      "sck_session_refresh_after",
      "session_issued_at",
      "access_issued_at",
      "refresh_issued_at",
      "sck_schedule_next_fire_at",
      "sck_schedule_created_at",
      "sck_schedule_delay_ms"
    ],
    "localStorage_keys": [
      "sck.selectedClient",
      "sck.profileName",
  "sck.sidebarCollapsed"
    ]
  },
  "routes": {
    "public": ["/login", "/signup", "/forgot"],
    "protected_bootstrap": "if sessionStorage.refresh_token then POST /auth/v1/token else redirect /login",
    "on_bootstrap_fail": "/login?reason=bootstrap_failed",
    "on_session_expired": "/login?reason=session_expired",
    "on_idle_timeout": "/login?reason=idle_timeout"
  },
  "client_rules": {
    "always_include_core": true,
    "default_selection": "core",
    "selection_key": "sck.selectedClient"
  },
  "cross_tab": {
    "channel": "sck-auth-sync",
    "messages": [
      { "type": "auth:logout" },
      { "type": "auth:token" }
    ],
    "guard_against_loops": true
  },
  "feature_flags": {
    "auto_refresh_on_401": "VITE_ENABLE_AUTO_REFRESH_ON_401"
  }
}
```

Authoritative reference for how authentication, tokens, timers, and storage work in sck-core-ui. This document exists to keep team alignment and prevent regressions.

## Overview

- Two-token model:
  - Session token (cookie): used only for `/auth/v1/**` endpoints. Managed by the server; refreshed via cookie rotation.
  - Access token (Bearer): used only for `/api/v1/**` endpoints. Kept in Redux memory only.
- Refresh token: stored only in `sessionStorage`, used to recover a new access token after reload/refresh or to refresh the access token and issue a new refresh token via OAuth 2.0 compliant endpoint `/auth/v1/token`.
- No tokens are ever stored in `localStorage`.
- Durable UI preferences (non-secrets) can live in `localStorage` (e.g., current client name).
- This is a multi-tenant platform.  
  - A tenant is called 'client'.
  - A 'client' is a {slug} for a tenant.
  - A 'client' represents an AWS Management Account. A master payer. The primary account. Invoicing account or cost center.
  - A 'client' is the top-level entity and all other records are subordinate or related to the selected client.
  - Each client maps to a separate, distinct, physically different database. Switching clients switches databases. The backend selects the database based on the access token’s tenant and the path’s `{client}` segment.
- A 'profile' is the user information. A user may have more than one profile for the client.
- The 'base' or 'login' client is named 'core'.  
  - When an /auth API requires 'client' as a parameter, we will, for the time being until we expand later, use the client 'core'.
  - 'core' is the "Automation" client. This is the group representing the AWS management account or billing account that manages the automation platform (this application) client and server.
- When the application boots or refreshes, it must initialize a user profile and a client list.
- 'core' is ALWAYS part of the clientList. The 'client list' clientList can never be empty. Even if fetching the client list fails, 'core' is always part of the client list. Note: 'core' WILL be returned in the client list fetch.
- If there is not a saved client name, always default to 'core'. Do not use the first name on the list. If 'core' is 20th in the list, then 'core' is selected as the default selection if no saved selection is available. If the saved selection is not in the list, default to 'core'.

## Storage rules

- access_token: Redux memory only. Not persisted to storage.
- refresh_token: `sessionStorage` only (survives reload, cleared on browser close).
- session cookie: HTTP-only secure cookie managed by the server (survives reload, subject to cookie lifetime).
- localStorage: UI prefs and cross-tab signals only. Today:
  - `sck.selectedClient` – the user’s last selected client (tenant) slug. This should persist across browser restarts and remain in local storage.
  - `sck.profileName` – reserved for the current profile name if/when needed. This should persist across browser restarts and remain in local storage.
- sessionStorage diagnostic keys (non-secrets, ephemeral):
  - `sck_session_expires_at`, `sck_session_refresh_after` (captured from headers)
  - `session_issued_at`, `access_issued_at`, `refresh_issued_at`
  - `sck_schedule_next_fire_at`, `sck_schedule_created_at`, `sck_schedule_delay_ms` (timer persistence)
- Expiration information for the session cookie is provided in `X-Session-**` headers when `/auth/v1/login` or `/auth/v1/refresh` execute.
- OAuth tokens from `/auth/v1/token` calculate expiration based on the standard `expires_in` OAuth response.

## Boot and recovery sequence

- On app load:
  - Public routes: no token bootstrap occurs.
  - Protected routes: TokenBootstrap checks for a `refresh_token` in `sessionStorage`. If present, it invokes `/auth/v1/token` (grant_type=refresh_token, form-encoded, PKCE/Basic as configured) to recover an access token into Redux memory. If refresh fails, navigate to `/login?reason=bootstrap_failed`.
  - The access token is never read from storage; if absent, it is recovered via refresh.
- Client hydration:
  - The store hydrates the selected client from `localStorage` key `sck.selectedClient`.
  - Redux slices (e.g., clients/portfolios) then fetch as needed. Use session storage as a last resort only.
  
  - Route gating: Protected pages require a valid in-memory access token. The app attempts refresh via the session cookie before denying access. Any direct navigation to `/login` is authoritative and should trigger a logout flow (see below).

## Timers and refresh

- SessionManager is responsible for proactive refresh scheduling:
  - Access token refresh is scheduled to occur slightly before expiry (default leeway: 5 minutes; configurable via `VITE_ACCESS_REFRESH_LEEWAY_MS`).
  - Session cookie refresh uses server-provided headers when available:
    - `X-Session-Exp` (epoch seconds when cookie expires)
    - `X-Session-Refresh-Threshold` (epoch seconds after which rotation is allowed)
  - If headers are not present, a heuristic falls back to `session_issued_at` + `VITE_SESSION_WINDOW_MINUTES` with a refresh-at of `VITE_SESSION_REFRESH_AT_MINUTES`.
  - Tab focus/visibility changes may trigger a near-term refresh check.
  - Optional feature: auto-refresh on API 401 events can be enabled with `VITE_ENABLE_AUTO_REFRESH_ON_401=true`.
  - Session cookie and session token refresh is handled via `/auth/v1/refresh`.
    - If an HTTP 401 Unauthorized is returned from this endpoint, the session cookie is missing or invalid.
    - The app immediately navigates to `/login?reason=session_expired`, ensuring a clean logout that is handled by the Login page itself.
    - Optionally, the navigation can include a message key similar to the idle timer (e.g., `/login?reason=idle_timeout`).
    - This addresses the edge case where idle timers are paused (sleep) but the session cookie expires in the meantime.

## Idle logout

- Dedicated 10-minute idle timer (mousemove, mousedown, keypress, scroll, touchstart, click reset it).
- On idle timeout:
   - Navigates to `/login?reason=idle_timeout`.
- Login.tsx page on load checks if logged in (refresh token exists, or redux data that exists but should be cleared after logout or other flag)
  - Login page calls `/auth/v1/logout` (POST with credentials) to clear the server cookie.
  - Login page clears `sessionStorage` and Redux state. LocalStorage is retained (UI prefs like selected client/profile name should persist).
  - Broadcasts a cross-tab logout via `BroadcastChannel('sck-auth-sync')`. Use a simple guard so tabs don’t bounce each other (if already processing logout or already on `/login`, ignore duplicates).
- Any navigation to the `/login` page should log out the user if the user is logged in, whether done by code or entered manually in the browser URL.

## Logout behavior (manual or error-driven)

- Always POST `/auth/v1/logout` with `credentials: 'include'` to delete the secure session cookie.
- Clear `sessionStorage` and Redux state; retain `localStorage`.
- Redirect to `/login` with a reason query param where applicable.

Known `reason` query params (non-exhaustive):
- `session_expired` – `/auth/v1/refresh` returned 401; session is invalid or missing.
- `idle_timeout` – idle timer expired.
- `bootstrap_failed` – access token refresh could not be recovered on protected route.
 - `me_unauthorized` – `/auth/v1/me` returned 401 (invalid/expired session); immediate logout.

Notes on refresh timing failures:
- If `/auth/v1/refresh` was not called in time and the session cookie became invalid, treat the outcome equivalently to idle/session expiry. Redirect to `/login?reason=idle_timeout` (preferred) or `/login?reason=session_expired` depending on UX preference. Do not use cookies with `/api` endpoints.

## API contract and formats

- `/auth/v1/token` uses OAuth 2.0 and is compliant with RFC standards. Requests are `application/x-www-form-urlencoded` with grant types:
  - `authorization_code` (with PKCE `code_verifier` when used)
  - `refresh_token`
  - Customization: include `state=client=<slug>` when switching tenants. The backend will issue a new access token and refresh token scoped to the requested client (tenant) rather than the client associated with the current refresh token.
- Confidential clients may include HTTP Basic Authorization header (`client_id:client_secret`).
- `/auth/v1/refresh` rotates the session cookie (204 No Content on success) and may emit session headers for client scheduling.
- `/auth/v1/me` requires the session cookie (session token).
- `/auth/v1/logout` clears the session cookie.
- `/api/v1/**` endpoints always require Bearer access token; `apiFetch` enforces this and will not fall back to cookies.
  - Cookies are never sent to `/api` endpoints (credentials: 'omit'). Session cookies are only sent to `/auth` endpoints.
### REST path conventions (registry)

- Tenanted resources include the client slug explicitly in the path under `registry`:
  - Portfolios list/create: `GET|POST /api/v1/registry/clients/{client}/portfolios`
  - Single portfolio: `GET|PUT|PATCH|DELETE /api/v1/registry/clients/{client}/portfolios/{portfolio}`
- This convention is preferred over `/api/v1/registry/{client}/...` for clarity and consistency across resources.

### Client selection invariant

- A client is always selected. The login tenant `core` is guaranteed present and used as default.
- UI should not render a “no client selected” state. If a saved selection is missing, select `core` automatically.
- When switching clients, token refresh uses `state=client=<slug>` as documented above.

## UI style guide (buttons)

- Page and list views: use neutral buttons by default (e.g., `variant="outline"`, `secondary`, or `ghost`). Avoid blue/primary/gradient styling on normal pages and for navigation/link actions.
- Dialogs, auth flows, and data entry: reserve primary/blue buttons for modal dialogs (overlays/popups), auth pages (login, signup, MFA), and edit/data-entry contexts (e.g., Save/Submit in forms).
  - Filters/search/facets are NOT data entry. Use neutral controls and neutral buttons (e.g., Add/Clear as outline/ghost), not blue primary.
- Examples:
  - Portfolios list “New” is a neutral button.
  - Edit mode forms (data entry) use a blue primary “Save/Submit” button and neutral secondary actions (Cancel, Reset).
  - Confirmation dialogs (modal) may use a blue primary action and a neutral secondary action.

- `/auth/v1/forgot` issues password token to be used in password reset.
- `/auth/v1/verify-secret` requires bearer forgot password token.
- `/auth/v1/password` requires bearer forgot password token.
- `/auth/v1/signup` creates a new user with sign-up page.

## MFA Login
- If the user has MFA active, the following process occurs
  - `/login` page calls `/auth/v1/login` – The cookie set is a "temporary MFA session". This cookie cannot be used to call any `/auth` endpoint except the MFA endpoints. `/login` responds with 202 and the body has `message="mfa_redirect"` with an HTTP-only cookie and embedded token of type `mfa_pending`. The cookie lifespan is 5 minutes.
  - UI navigates to the 'enter mfa code page'
  - User enters MFA code into the form and submits `/auth/v1/mfa/verify`.
  - The server validates the code and responds with HTTP 200 and the real session cookie and the `X-Session**` expiration information.
  - The login process continues with call to OAuth `/auth/v1/authorize` to begin generating access token.

## API Response

- OAuth 2.0 endpoints `/auth/v1/authorize`, `/auth/v1/token`, or others respond with data body as defined in the standards specification.
- Non OAuth 2.0 endpoints in /auth and ALL endpoints in /api respond with data wrapped in response body.  Response body  { "status": "ok", "code": 200, "data": [{ object }] | {object}, "metadata": { object }, "message": "the message", "links": { object }} per the Response object specification or is subclasses which can add fields.  
- the data attribute in response body could be array [] if list of data is expected or a single object {}

### API envelope contract (machine-readable)

```json
{
  "status": "ok",
  "code": 200,
  "data": [ { "object": "..." } ] | { "object": "..." },
  "metadata": {
    "cursor": "optional-cursor-or-null",
    "total": 123,
    "page_size": 50,
    "has_more_pages": false
  },
  "message": "optional-human-message",
  "links": { "self": "/...", "next": "/..." }
}
```

UI consumption rules (do this):
- Always parse responses via a single envelope reader that returns `{ data, cursor }` and the raw body for diagnostics.
- Treat `data` as either list or object; normalize with a helper like `toArray(data)`.
- Ignore top-level `status`, `code`, `message`, `links` for data flow; use HTTP status for control flow.
- Read pagination from `metadata` (e.g., `cursor`, `has_more_pages`). Cursor may be string or null.

Example YAML representation of a response body object containing a list response from portfolios API:

```yaml
status: ok
code: 200
data:
  - portfolio: ocp
    name: OpenShift Cloud Platform
    domain: ocp.eits.com.sg
  - portfolio: core-automation
    name: Core Automation Engine
    domain: automation.eits.com.sg
metadata:
  cursor: null
  page_size: 50
  total: 2
  has_more_pages: false
```

Notes:
- The UI must never assume bare arrays at the top level; always extract from the `data` property.
- When `data` is an object, `toArray(data)` should produce `[data]` for list UIs; when null/undefined, treat as `[]`.

### Error envelope contract (machine-readable)

All error responses also include the same top-level envelope fields and add these:

```json
{
  "status": "error",              // or "fail"
  "code": 400,                     // HTTP-aligned code
  "message": "human-readable summary",
  "error": "machine_key",         // single error key (e.g., "validation_error", "unauthorized")
  "errors": [ ]                     // optional details list of string or lines in error traceback print,
  "data": [],                      // may be empty or omitted
  "metadata": { },
  "links": { }
}
```

Examples:
- Unauthorized (401):

```json
{
  "status": "error",
  "code": 401,
  "message": "Unauthorized",
  "error": "unauthorized",
  "errors": ["token missing or expired"],
  "data": [],
  "metadata": {},
  "links": {}
}
```

- Validation (400):

```json
{
  "status": "fail",
  "code": 400,
  "message": "Validation failed",
  "error": "validation_error",
  "errors": [
    { "field": "portfolio", "message": "Must be lowercase" },
    { "field": "name", "message": "Required" }
  ],
  "data": [],
  "metadata": {},
  "links": {}
}
```

AI/dev usage rules (uniform across ALL /api):
- Every /api response body includes: `status`, `code`, `data`, `links`, `metadata`, `message`.
- On success, read domain objects from `data` (list or object). Normalize with `toArray` when needed.
- On error, prefer HTTP status for control flow, surface `message`, and attach `error`/`errors` details for UX as appropriate.
- Do not assume top-level arrays or ad-hoc shapes; always parse the envelope first.

### Tenancy scoping invariants (registry)

- All registry endpoints are explicitly scoped by client in the path, e.g., `/api/v1/registry/clients/{client}/portfolios`.
- The backend enforces client isolation; responses already contain only the selected client’s records.
- Do not introduce or rely on synthetic client fields within returned records (e.g., do not add or filter by `clientId` or `client_id` on portfolios).
- The selected client influences:
  - The API URL path parameter `{client}`.
  - `state=client=<slug>` during token refresh/switch per this document.
  - Not navigation/query params: do NOT include `?client` in URLs. Client/tenant context is derived solely from the access token and the path.

Do/Don’t checklist for list UIs
- Do:
  - Call the client-scoped endpoint using the selected client slug.
  - Parse with the envelope reader and normalize to arrays.
  - Render the list as returned; apply only user-entered filters (search chips, facets).
- Don’t:
  - Filter records by a non-existent portfolio field like `clientId`/`client_id`.
  - Read from `status`/`code` to determine success; use HTTP status + envelope shape.
  - Assume top-level arrays; always use the `data` property.
  - Append `?client` to links or forms; the client is already in the path and token.

### Tenant isolation model (databases)

- Each client is a tenant. Each tenant maps to a separate, distinct, physically different database.
- Switching clients switches databases. The backend chooses the database from the access token’s tenant plus the `{client}` segment in the URL.
- Never carry tenant identity in query strings or embed it inside records. Do not pass `?client` in UI links or forms.
- UI consequences:
  - When the selected client changes, clear tenant-scoped Redux slices (zones, portfolios, applications, deployments, etc.) and re-fetch in the new context.
  - Cross-tenant leakage must be impossible without explicitly switching token scope via the documented flow.

### List vs detail fetch rule

- List endpoints may return summaries optimized for catalog views.
- Detail pages must fetch the full record via the single-resource endpoint upon navigation, even if the list has an item with the same slug.
- Do not populate detail views from list payload fields; always re-fetch the canonical record.


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

Client switch (tenant switch)
- When switching to a different client (tenant):
  - The app requests new tokens via `/auth/v1/token` using `grant_type=refresh_token` with the refresh token from `sessionStorage` and includes `state=client=<slug>`.
  - On success, the app clears tenant-scoped Redux slices (zones, portfolios, applications, deployments, etc.) and the views refetch for the new client context.
  - On success, only the refresh token rotation is persisted to `sessionStorage`. The access token is kept in Redux memory. LocalStorage is never used for tokens.
  - If the request returns 401, treat it as "Unauthorized to access client"; do not logout and do not change the current client. Optionally surface a user message. The app remains scoped to the previous client.
  - Any bootstrap for the newly selected client proceeds only after successfully obtaining the new access token.

---

This document is normative for sck-core-ui. If behavior deviates, update the implementation or this document to re-align.

## Expected behaviors (detailed)

These statements clarify intent for current behavior. If code differs, treat this as authoritative and align implementation.

- Protected route bootstrap:
  - If `refresh_token` exists at app load on a protected route, call `/auth/v1/token` to recover an access token.
  - On failure, navigate to `/login?reason=bootstrap_failed`.
- Session refresh scheduling:
  - Prefer server-provided headers (`X-Session-Exp`, `X-Session-Refresh-Threshold`).
  - If absent, use heuristic: `session_issued_at` + `VITE_SESSION_WINDOW_MINUTES`; refresh at `VITE_SESSION_REFRESH_AT_MINUTES`.
  - Consider tab visibility and user focus to opportunistically refresh soon after returning to the app.
- 401 handling:
  - If `VITE_ENABLE_AUTO_REFRESH_ON_401=true`, perform one bounded refresh attempt; do not loop. Subsequent 401s surface to the caller.
  - Special-case: `/auth/v1/me` 401 indicates the session cookie is invalid or expired and cannot be refreshed; navigate to `/login` immediately with `reason=me_unauthorized` (includes `returnTo` for convenience).
- Cross-tab logout:
  - Broadcast a single `logout` message on `BroadcastChannel('sck-auth-sync')`.
  - Implement a guard so tabs don’t trigger each other repeatedly. If a tab is already on `/login` or already processing logout, ignore duplicates.
- Login navigation is authoritative:
  - Any navigation to `/login` should run the logout flow (clear session cookie via `/auth/v1/logout`, clear sessionStorage + Redux, retain localStorage), regardless of how navigation occurred.
- Client hydration defaults:
  - Always include `core` in the client list and never allow an empty list.
  - If there’s no saved client, select `core` (even if it’s not first in the returned list).
- Storage boundaries:
  - Access token: Redux memory only.
  - Refresh token: sessionStorage only (cleared on browser close).
  - Cookie: HTTP-only, rotated; used for `/auth/**` only.
  - Durable UI prefs (e.g., `sck.selectedClient`, `sck.profileName`) in localStorage.

## Future considerations / roadmap

- Coordinated refresh across tabs:
  - Option to use a `sck-auth-sync` message (`refresh_requested`/`refresh_completed`) to avoid refresh storms.
- Granular reason codes:
  - Extend `reason` query param set (e.g., `mfa_required`, `reauth_required`, `cookie_missing`).
- Idle policy tuning:
  - Make idle duration configurable; consider a warning modal before timeout with a keep-alive action.
- Partial offline handling:
  - If `/auth/v1/token` is unreachable but session cookie exists, optionally show a retry banner instead of immediate logout.
- Client/profile scoping:
  - Support multiple profiles per user per client; `sck.profileName` may be used to scope UI defaults per profile.
- Security hardening:
  - Audit reducers/selectors to ensure no token-like secrets leak to localStorage or logs.
- Telemetry (optional):
  - Emit structured events for auth state transitions (bootstrap start/success/fail, refresh start/success/fail, idle timeout) for diagnostics.

## Design decisions and historical notes

- LocalStorage retention on logout
  - Earlier drafts suggested clearing both `sessionStorage` and `localStorage` during logout. We chose to retain `localStorage` to persist non-secret UI preferences (e.g., `sck.selectedClient`, `sck.profileName`).
  - Trade-off: retaining prefs improves UX after re-login. If a stricter posture is needed, see “Future considerations” for a configurable full wipe option.
- “/login is authoritative”
  - Any navigation to `/login` triggers the logout flow. This centralizes cleanup, prevents partial state, and avoids inconsistencies across entry points.
- Refresh-first route gating
  - Protected routes attempt an access-token refresh (using the session cookie) before denying access. This reduces spurious logouts during normal cookie rotation.
- Access token storage boundary
  - Intentionally never persisted to durable storage. This design decision reduces blast radius of XSS and aligns with least privilege.

## Archival policy

- We do not delete content from this document unless it is a direct duplicate or objectively incorrect.
- Superseded or experimental ideas should be moved to an "Archived notes" subsection with a short rationale and date.
- When wording is tightened for clarity, original intent is preserved in "Design decisions and historical notes" if there’s any risk of nuance being lost.

## Document change log

- 2025-09-12 (housekeeping)
  - Fixed minor typos and capitalization; tightened grammar in multi-tenant overview.
  - Corrected JSON snippet indentation in machine-readable policy section.
  - Aligned YAML example to use `metadata.total` (was `total_count`) to match the envelope contract.

- 2025-09-12 (later)
  - Added UI button style guidance (neutral on pages; blue primary only for dialogs/auth flows).
  - Documented client switch via `state=client=<slug>` with sessionStorage-only refresh token rotation and no localStorage usage.
  - Clarified BroadcastChannel message shapes `{ type: 'auth:logout' }`, `{ type: 'auth:token' }`.
  - Clarified `/auth/v1/me` 401 causes immediate logout (`reason=me_unauthorized`) due to invalid session cookie.
  - Stated explicit cookie policy: cookies omitted for `/api` endpoints, included for `/auth` only.

- 2025-09-12
  - Clarified protected-route bootstrap failure behavior and route gating.
  - Fixed typos across OAuth, parameters, and persistence language.
  - Documented cross-tab logout guard and known `reason` query params.
  - Added "Expected behaviors (detailed)", "Future considerations / roadmap", and "Design decisions and historical notes".
  - Added archival policy and this change log to avoid accidental loss of ideas.

- 2025-09-12 (tenant isolation)
  - Codified tenant-per-database model; “switching clients switches databases”.
  - Prohibited `?client` in UI routes/links; tenant context derives from token + path only.
  - Added list-vs-detail fetch rule requiring detail pages to fetch the full record.
  - Updated tenancy scoping bullets and Do/Don’t checklist accordingly.
