# Project-Wide Guidelines for Copilot Suggestions (SCK Core UI)

## Contradiction Detection
- For every prompt, compare against rules in:
  - `docs/auth-session-and-storage.md` (auth, tokens, storage, routes, API responses)
  - `docs/ui-style-guide.md` (UI headers, typography, buttons)
  - `docs/portfolio-model.md` (portfolio schema, API models)
  - `docs/backend-code-style.md` (backend services, S3, Lambda)
- If a prompt contradicts any rule (e.g., inline CSS, storing tokens in localStorage, non-standard API responses), respond with:
  1. Warning: "Your instruction '[quote]' conflicts with [rule] in [source file]."
  2. Options: "Modify prompt to align with [rule], or update [source file]."
  3. Example: "Prompt suggests inline CSS, but `docs/ui-style-guide.md` mandates `theme.css`. Use `bg-primary` or update style guide."
- Proceed with suggestions only if the conflict is resolved or clarified.

## Key Rules (Excerpts for Sticky Context)
### Auth & Session (`docs/auth-session-and-storage.md`)
- **Tokens**:
  - Session cookie: HTTP-only, for `/auth/v1/**` only, rotated via `/auth/v1/refresh`.
  - Access token: Redux memory only, for `/api/v1/**`, refreshed via `/auth/v1/token`.
  - Refresh token: `sessionStorage` only, key `refresh_token`.
- **Client requests**:
  - All UI calls to `/api/v1/**` MUST include `Authorization: Bearer <access_token>` using `useApiHeaders().getAuthHeaders()`.
  - Do NOT attach Authorization when calling presigned S3 URLs (PUT/GET) — S3 will reject those headers.
  - For asset GET helpers (icons, etc.), prefer a small auth-aware fetch wrapper that follows redirects and renders a Blob URL.
- **Storage**:
  - `localStorage`: UI prefs only (e.g., `sck.selectedClient`, `sck.profileName`).
  - `sessionStorage`: Ephemeral keys (e.g., `refresh_token`, `sck_session_expires_at`).
  - No tokens in `localStorage`.
- **Routes**:
  - Public: `/login`, `/signup`, `/forgot`.
  - Protected: Require access token; attempt refresh, else redirect to `/login?reason=bootstrap_failed`.
  - Logout: Via `/login` page, clears sessionStorage/Redux, retains localStorage.
- **API Responses**:
  - Non-OAuth: Use envelope `{ status, code, data, metadata, message }`.
  - OAuth: Follow RFC 6749 (e.g., `/auth/v1/token`).
- **Client Selection**:
  - Always include `core` client; default to `core` if no saved selection.
  - Switch clients via `/auth/v1/token` with `state=client=<slug>`.

### UI Style Guide (`docs/ui-style-guide.md`)
- **Headers**:
  - Use `DashboardLayout` with `pageTitle`/`pageSubtitle` (classes: `sck-page-title`, `sck-page-subtitle`).
  - No local `<h1>`/`<h2>` in page content.
- **Create Pages (single-card forms)**:
  - Do not use `DashboardLayout`.
  - Use a single centered `Card` (e.g., `mx-auto max-w-lg md:max-w-xl`) with `CardHeader > CardTitle` for the form title and `CardContent` for fields.
  - Footer actions: `Cancel` is neutral (`variant="ghost" | "secondary"`), `Save` is primary (`variant="primary"`). Avoid back arrows when `Cancel` is present.
- **Sections**:
  - Use `CardHeader` with `CardTitle` (`sck-section-title`) and `CardDescription` (`sck-section-subtitle`).
- **Buttons**:
  - Lists/navigation: Neutral (`variant="ghost"`, `size="sm"`, `text-muted-foreground`).
  - Forms/dialogs: Primary (`variant="primary"`) for Save/Submit.
  - Destructive actions use `variant="destructive"` and belong in dialogs or form footers (not page headers).
  - Components from `components/ui/` (e.g., `Button`, `CardTitle`).
- **Tabs**:
  - Use section cards; avoid page-level titles in tabs.

### Portfolio Model (`docs/portfolio-model.md`)
- **Schema**:
  - Key: `Portfolio` (string, required).
  - Fields: `Name`, `OwnerFacts`, `Compliance`, etc.
  - Storage: PynamoDB table `<client>-core-automation-portfolios`.
- **API**:
  - Endpoints: `/api/v1/registry/clients/{client}/portfolios`.
  - Responses: Use envelope `{ status, code, data }`.
  - List payloads include at minimum: `portfolio`, `name`, `created_at`, `updated_at`. UIs must render `updated_at` from the list response without fetching the detail.
- **Behavior**:
  - Tenant switch clears and refetches portfolios for the selected client.

### Backend Code Style (`docs/backend-code-style.md`)
- **Modules**: Use `core_framework`, `core_logging`, `core_db`, `core_api`.
- **S3**:
  - Prefixes: `packages`, `files`, `artefacts`.
  - Lifecycle: Objects transition after 30/60/90 days to lower-cost classes (Standard-IA → One Zone-IA → Glacier Instant Retrieval). Core automation deletes package/file/artefact objects when a deployment is removed.
  - Use `MagicS3Bucket` for bucket operations. For presigned URLs, use the boto3 client directly (MagicS3Bucket does not implement `generate_presigned_url`). See `core_helper/magic.py`.
- **Lambda**:
  - Use `ProxyEvent` for event decoding (auto-handles base64, JSON) for lambda handler from AWS API Gateway or the FastAPI Gateway proxy adapter.
- **Python**:
  - Structure: Import `core_framework`, `core_logging`, `core_helper.aws`.
  - S3 access: Use `MagicS3Bucket` for bucket operations.

## Suggestions
- **Context**: Use `#codebase` to reference `docs/*.md`, `src/auth/*`, `components/ui/*`, or open files in VS Code for automatic inclusion.
- **Output**: Provide code diffs, explanations, and contradiction warnings.
- **Strictness**: Enforce rules exactly as documented; flag deviations with specific file references.

## Redux Store: Data Access Policy (MANDATORY)
- All data operations to `/api/v1/**` MUST be implemented in Redux slices as async thunks. Do not fetch in React components.
  - Actions covered: `GET` (list/detail), `POST` (create), `PUT` (update), `PATCH`, `DELETE`.
  - Components should only dispatch thunks and select state using exported selectors.
- Caching and invalidation:
  - Maintain `status`, `error`, and `lastFetched` in each slice. Prefer updating in-place (merge by key) on detail fetches.
  - Provide targeted selectors (e.g., `selectApplicationByKey(state, portfolio, app)`).
  - After create/update/delete, either merge the returned item into state or refetch the affected list (bounded by `limit`) via a thunk.
- API envelope and headers:
  - Use `apiFetch` with `cookieFirst: true` and parse responses with `parseApiEnvelope`.
  - Include `Authorization` via `useApiHeaders().getAuthHeaders()` or equivalent helper used by `apiFetch`.
- Route params vs. model keys:
  - Use canonical keys in paths (e.g., `apps/{app}` for app slug). Non-key fields (e.g., `app_regex`) belong only in request bodies, not URLs.
- Testing and type safety:
  - Export thunk types and ensure all slices pass `yarn type-check`.
  - Prefer minimal, composable thunks and small helpers for URL building.

## Precedence Note
- When used within the monorepo, this file is the canonical UI rule set. If any root instruction appears to conflict, prefer this file and raise a contradiction notice.