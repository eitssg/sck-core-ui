# APP Facts

## Make Name required at create

- It’s the human label users care about. Require it on POST. Allow edits later.
- Don’t default Name from App. If you must prefill, derive a title-cased suggestion from repo/PRN/app, but still require explicit confirmation.

## Keep App (slug) required, stable, and unique per portfolio

- URL ID only. Generate from Name; user can override in “Advanced”.
- Immutable after create (or treat renames as new slugs + alias/redirect if needed).

## Make AppRegex optional input with strong defaults

- If absent, generate: ^prn:{portfolio}:{app}:{branch}:{build}$ with defaults branch=main, build=latest.
- “Any branch/build” toggles map to [^:]* in those segments.
- Users may override AppRegex entirely for advanced matching.

## Validation behavior

- POST requires: portfolio (path), Name (body). App optional (server generates). AppRegex optional (server generates).
- 409 if client-supplied App collides, include suggestions (e.g., -dev, -prod, -hash).

## UI for “New Deployment”

- Portfolio (read-only).
- Name (required).
- URL ID (App) auto from Name, editable under “Advanced”.
- Branch/Build with “Any …” toggles.
- Read-only Regex preview that updates live.
- Save returns the full record including the generated App and AppRegex.