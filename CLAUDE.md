# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The workspace `../CLAUDE.md` is the main guide (system architecture, rules, repos). This file covers only the
BackOffice frontend.

## Sources of truth

- `../requerimientos/BACKOFFICE_DEALERS.spec.md` (v1.4, in Spanish): section 8 (frontend), Annex A (every visible text),
  section 6 (API contract), section 11 (phases B6–B9 and their acceptance criteria). Build one phase at a time.
- `../REPORTE_CRITERIOS_BACKOFFICE.md`: what is closed and what is open. Read it at the start of every session.
- `docs/openapi.json`: the real API contract (snapshot of the backend). If it disagrees with a spec example, the
  snapshot wins for types; tell the owner.

## Current state

B6 is done: scaffold, `api.ts`, session + guards, `AuthLayout`/`AppLayout`, Login, Recuperar, Restablecer, Cambiar
contraseña, Inicio, 403, 404 and base components. B7 (users, profile, audit log) and B8 (dealers) are next. Their
routes already exist with guards and a `PlaceholderPage` (title only) that B7/B8 replace. Components still to build
when first needed: DataTable, Pagination, Select, Modal, ConfirmDialog (native `<dialog>` + `showModal()`), Badge,
EmptyState; `src/lib/download.ts` and `src/lib/validators/{ruc,dni,phone}.ts`.

## Rules (spec section 8.1 + owner's decisions)

- React + Vite + strict TypeScript (`noUncheckedIndexedAccess`). SPA, no SSR, no component library.
- All visible text in Spanish, verbatim from Annex A. Code and identifiers in English. A text that Annex A lacks must
  be approved by the owner and then added to Annex A (as done on 17/11/2026 for the 403/404 titles and the checklist's
  "(cumplido)"/"(pendiente)").
- **Every API call goes through `src/lib/api.ts`.** No `fetch` anywhere else (ESLint `no-restricted-globals` +
  `tests/source-rules.test.ts`). In B8 the Excel download also fetches in `api.ts` (returns the blob + the
  `Content-Disposition` filename); `download.ts` only builds the temporary link (spec v1.4, 2.5 and 8.2).
- In B7/B8, load each module's screens with `lazy` routes (owner-approved, 17/11/2026): the B6 bundle is already
  ~499 kB and Vite warns at 500 kB.
- Never `window.alert` / `window.confirm` (ESLint + test). Confirmations → `ConfirmDialog`; messages → `Alert` or
  `Toast`. Don't even write those words in `src/` comments: the B6.10 search would flag them.
- Tailwind CSS 4 with `@theme` tokens in `src/styles/global.css` (`brand`, `brand-dark`, `surface`, `danger`,
  `danger-surface`, `success`, `success-surface`, `warning`, `warning-surface`). No hex in `src/` code; a new color
  becomes a token first and gets an AA check in `tests/theme-contrast.test.ts`. Neutrals use Tailwind's `slate-*`.
- No inline scripts or styles (the CSP of spec 8.8 forbids them; `vite preview` serves that CSP and the e2e fixture
  fails on any CSP violation). No `style` props.
- No `localStorage`/`sessionStorage` for session data: the session is only the HttpOnly `__session` cookie.
- `PENDIENTE-n` items get only their "mientras tanto" + `TODO(PENDIENTE-n)`. None apply to B6.
- Dependencies: only those of spec 2.4 plus their tooling. Ask the owner before adding anything else.
- Don't commit unless asked. Never run `firebase deploy` or anything on GCP/the VPS unless asked.

## Architecture

- `src/lib/api.ts`: relative base `/api/v1/backoffice` (same origin in every environment, spec 2.3),
  `credentials: "same-origin"`, `X-Requested-With: XMLHttpRequest` on every non-GET (without it the API answers 403
  `CSRF_HEADER_MISSING`), 15 s `AbortController` timeout (body read included). Never throws: `{ ok: true, data }` or
  `ApiFailure { kind: "NETWORK" | "HTTP", status (0 on NETWORK), code?, detail?, field?, fieldErrors? }`.
  `fieldErrors` comes from the API's `field` or from Pydantic's 422 (`loc` last element). Types come from
  `src/lib/api-schema.d.ts` (generated, **versioned**; `npm run api:types`; `tests/api-types.test.ts` fails if stale).
  `tokenStatus` is a plain `string` in the OpenAPI.
- `src/lib/errors.ts`: `ApiError` + `unwrap()` (queryFn/mutationFn must throw `ApiError`, or the global handling
  below never sees the failure), `failureOf`, `failureMessage` (network or 5xx or no `detail` → Annex A.1 connection
  message; otherwise the API's `detail`), `REQUIRED_MESSAGE` ("Campo obligatorio", the API translator's text).
- Session (`src/auth/`): the `["me"]` query holds a `SessionState`: `{status: "authenticated", me}` or
  `{status: "anonymous", reason: "none" | "expired" | "logout"}`. `fetchSession` turns a 401 from `/auth/me` into
  "anonymous" (reason `expired` if the code is `SESSION_EXPIRED` or the tab had a session; `none` otherwise).
  **Only `RequireAuth` redirects for session reasons** (`loginPath()` in `src/lib/navigation.ts`), so there is never a
  race between two navigations:
  - `none` → `/login?next=<path>`; `expired` → `/login?motivo=sesion-expirada&next=<path>`; `logout` → `/login`.
  - Global handler (`src/app/queryClient.ts`, Query/Mutation cache `onError`): 401 → `endSession("expired")`;
    403 `PASSWORD_CHANGE_REQUIRED` → `setMustChangePassword(true)`. Mutations with `meta: { ignoreAuthErrors: true }`
    (login, logout) are skipped.
  - The rest of the cache is cleared when the login page mounts without a session (`removeNonSessionQueries`) and on
    a successful login (`startSession`), never while protected screens are still mounted.
  - `useMe()` throws outside `RequireAuth`.
- Routes (`src/app/router.tsx`, guards as layout routes): `AuthLayout` → `/login`, `/recuperar-contrasena`,
  `/restablecer-contrasena`, `*` (404). `RequireAuth` → `AppLayout` → `/cambiar-contrasena` and
  `RequirePasswordChanged` → `/`, `/sin-permiso`, `/perfil`, `RequireModule(code)` → module routes. Module path,
  menu label and Home card description live in `src/app/modules.ts` (decision D1: `/auth/me` has no description).
- Login (`LoginPage`): after a successful login it goes to `/cambiar-contrasena` if `mustChangePassword`, else to a
  safe `next` (`safeNext`: must start with `/`, not `//` or `/\`) or `/`. A user who arrives already logged in goes to
  `/` (spec 8.4). Redirects happen by rendering `<Navigate>` from the session state, not from `onSuccess`.
- Change password: on success it lowers `mustChangePassword` in the cache **before** navigating (otherwise
  `RequirePasswordChanged` would bounce back), invalidates `["me"]`, shows the toast and goes to `/`. In mandatory
  mode `AppLayout` hides the side menu and the user menu and shows only "Cerrar sesión".
- Reset password: reads `t` once into state, removes it from the URL (`navigate(..., { replace: true })` =
  `history.replaceState`), `gcTime: 0` on the token query. The checklist's "No debe contener tu usuario ni tu DNI"
  item is neutral (`unknown`) there (decision D2): the server validates it.
- Client validation (`src/features/auth/schemas.ts`, zod) mirrors the API: the password policy produces the exact
  `PASSWORD_POLICY` detail of Annex A.3 (`src/lib/validators/password.ts`, a mirror of `app/core/passwords.py`:
  `\p{Lu}`, `\p{Ll}`, `[0-9]`, `[^\p{L}\p{N}\s]`, lengths in code points). Policy values come from
  `GET /auth/password-policy`. No `maxLength` on password inputs (a silent truncation would change the password).
- `Alert`: the live region (`role="alert"`/`"status"`) is always mounted and only its content toggles (same pattern
  as the landing); clear the message before setting it again to re-announce. `live={false}` for fixed notices.
- `Toast` lives above the router (`src/app/providers.tsx`), so it survives navigation.
- `QueryClient`: `retry: false` everywhere (screens show "Reintentar"). `main.tsx` creates the router and the client
  once, outside React.

## Local stack against the real API

Verified on 17/11/2026 (16/16 steps, see the report). The API's `.env` now has the "BackOffice" and "Correo del
BackOffice" blocks of its `.env.example` (`BACKOFFICE_SESSION_COOKIE_SECURE=false`, Mailpit on `localhost:1025`).
`consents_db` has one user, `admin` (local test data of spec 5.11.1); if its password is unknown, generate a new
temporary one with `uv run python -m app.cli.backoffice reset-password --username admin` (from `../yamaha-consent-api`).
Start: `docker compose up -d kizuna-mock mailpit` and `uv run uvicorn app.main:app --port 8000` there, `npm run dev`
here. Never print the API's `.env`.

## Commands

- `npm run dev` (port 5173, proxy `/api` → `http://localhost:8000`), `npm run build` (`tsc -b && vite build`),
  `npm run preview`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run api:types`.
- TypeScript projects: `tsconfig.app.json` (browser code, `types: ["vite/client"]` only: no Node globals),
  `tsconfig.test.json` (src tests, + Node types), `tsconfig.node.json` (configs, `e2e/`, `tests/`).
- Vitest projects (`vitest.config.ts`): `dom` (jsdom, `src/**/*.test.ts(x)`, setup `src/test/setup.ts`) and `node`
  (`tests/**/*.test.ts`). No Vitest globals: import `describe/it/expect` explicitly.
- e2e (`playwright.config.ts`): builds into `dist-e2e/` (never touches `dist/`) with `VITE_ENVIRONMENT_LABEL=PRUEBAS`,
  previews on port 4323 with the spec 8.8 headers. `e2e/mock-api.ts`:
  - `test`/`expect` come from there; the `api` fixture is `auto`, so **every** test has the mock (an unmocked request
    would otherwise reach the preview proxy → a real local API).
  - `api.user` simulates the `__session` cookie (`/auth/me` → 200 or 401 `AUTH_REQUIRED`). A login 200 sets it, a
    logout clears it, a change-password 204 clears `mustChangePassword`.
  - `api.respond(endpoint, ...responses)`: one per call, the last repeats; `"network-error"` aborts.
  - Fixtures: `ADMIN`, `OPERATOR` (only DEALERS), `NEW_ADMIN` (`mustChangePassword`), `POLICY`.
  - Under 1024 px the side menu is collapsed: use `openMainMenu()` from `e2e/helpers.ts` (decides by viewport width).
  - When adding endpoints in B7/B8, add them to `ENDPOINTS` and `defaultResponse` in the mock.
- Single e2e test: `npx playwright test -g "texto"`; one project: `--project=desktop`.
- `@types/node` is pinned to the Node 24 line (`~24.19.2`) and only `tsconfig.node.json`/`tsconfig.test.json` load
  it. `typescript` is pinned to `~6.0.3`: typescript-eslint 8 requires `< 6.1`, and `package.json` `overrides` makes
  openapi-typescript (peer `typescript ^5`) accept it. Check both before upgrading TypeScript.
- `npm audit` reports a high-severity ReDoS in `picomatch` (dev tooling only: Vite, Vitest, typescript-eslint); no
  fixed version exists on 17/11/2026. `npm audit fix --force` would downgrade Vitest: don't run it.
