# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The workspace `../CLAUDE.md` is the main guide (system architecture, rules, repos). This file covers only the
BackOffice frontend.

## Sources of truth

- `../requerimientos/BACKOFFICE_DEALERS.spec.md` (v1.5, in Spanish): section 8 (frontend), Annex A (every visible text),
  section 6 (API contract), section 11 (phases B6–B9 and their acceptance criteria). Build one phase at a time.
- `../REPORTE_CRITERIOS_BACKOFFICE.md`: what is closed and what is open. Read it at the start of every session.
- `docs/openapi.json`: the real API contract (snapshot of the backend). If it disagrees with a spec example, the
  snapshot wins for types; tell the owner.

## Current state

B6 (base, auth, guards, Inicio, 403/404), B7 (Usuarios, Mi perfil, Bitácora) and B8 (Dealers, Excel export) are
done. B9 (deploy: `firebase.json`, VPS files, guides) is next; run nothing on the VPS or GCP unless asked. Session 5
decisions (spec v1.5: 8.2, 8.6, A.1, A.2, section 14):
Activar/Desbloquear without confirmation; audit "Usuario" filter = all live users from `GET /users` (deleted ones only
if the URL brings their id; without the `USUARIOS` module, or on a 403, the actors of the loaded results); audit "Entidad" links to the detail; audit defaults to today − 6 … today (Lima) written to
the URL with `replace`; every committed filter/sort/page change pushes a history entry; client mobile normalization
uses prefix `51`; approved texts (pagination, "Todos", "Selecciona", "—", "Menú", "Menú principal", row-action
`sr-only` suffix, "Detalle del usuario"/"Detalle del dealer", "Usuario eliminado."); Excel export timeout 60 s
(D3), every other call 15 s.

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
- `PENDIENTE-n` items get only their "mientras tanto" + `TODO(PENDIENTE-n)`. None apply to B6–B8.
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
- Lazy routes (`src/app/router.tsx`): each module's routes import one file (`features/users/pages.ts`,
  `features/profile/ProfilePage`, `features/audit/AuditLogPage`), so a module is one chunk. The `RequireAuth` route
  has `hydrateFallbackElement`. Dealers: `features/dealers/pages.ts`.
- Lists (`src/lib/listParams.ts`): filters, sort and page live in the URL. `useUrlParams()` returns `[params, update]`;
  `update(patch)` pushes a history entry, drops empty values and resets `page` unless the patch has it
  (`{ replace, keepEmpty }` options). Readers (`readText/readEnum/readPage/readPageSize/readSort`) ignore unknown
  values; `nextSort` toggles; `useClampPage` jumps back when the URL page is past the end. Queries use
  `placeholderData: keepPreviousData` and the table gets `busy`.
- `SearchField`: local text + URL value; calls `onSearch(trimmed)` 300 ms after the last key; "Atrás" updates it.
- `DataTable`: semantic table, sortable headers (button + `aria-sort`), scroll region (`role="region"`,
  `tabIndex=0`, **`relative`**: without it, `sr-only` spans in cells escape the scroller and widen the page on mobile),
  `renderExpanded` for an extra row. Row actions use `actionClasses()` + `<RecordName name=...>` (sr-only suffix).
- `Modal` (native `<dialog>` + `showModal()`): `open` drives it; Escape calls `onDismiss` (none → `closedby="none"`
  and it reopens if the browser force-closes); content exists only while open; focus returns to the opener; an
  element with `data-autofocus` gets the initial focus. `ConfirmDialog` builds on it (focus on "Cancelar"). jsdom has
  no `showModal()`: `src/test/setup.ts` adds a minimal one.
- Users (`src/features/users/`): `useUserActions()` owns the confirm dialog + `TemporaryPasswordModal` + mutation for
  list and detail (returns `run`, `pendingUserId`, `dialogs`); `UserActionButtons` shows actions by status and hides
  Desactivar/Eliminar/Generar contraseña temporal for the logged-in user. The edit form sends the `version` it was
  loaded with (a background refetch must not hide a `VERSION_CONFLICT`); "Recargar" refetches and resets.
- Dealers (`src/features/dealers/`): `UbigeoSelects` (Departamento → Provincia → Distrito; next level disabled until
  the previous has a value; `mode` "filter" ("Todos", URL) or "form" ("Selecciona", react-hook-form `ref`s via
  `registered` so the first error gets focus); `useDealerDelete()` (confirm + delete + toast, list and detail).
  Export: `exportDealers(filters)` in `api.ts` (`request` options `timeoutMs` 60 s, `accept`, `read` → `{blob,
  filename}` from `Content-Disposition`), then `saveFile()` in `src/lib/download.ts` (temporary hidden link, revoked
  1 s later). It sends the list's filters and sort, never `page`/`pageSize`.
- Forms: zod schemas mirror the API with its messages (`src/lib/validators/{dni,phone,ruc,text}.ts`,
  `src/lib/fieldSchemas.ts`: `requiredField`, `optionalField`, `emptyToNull`). Server 409/422 go to the field with
  `applyFieldErrors`.

## Local stack against the real API

Verified on 17/11/2026 (16/16 steps, see the report). The API's `.env` now has the "BackOffice" and "Correo del
BackOffice" blocks of its `.env.example` (`BACKOFFICE_SESSION_COOKIE_SECURE=false`, Mailpit on `localhost:1025`).
`consents_db` has the owner's `admin` (local test data of spec 5.11.1) and, since session 5 (21/21 real steps, see the
report), the QA users `qa.admin5` (ADMIN) and `qa.operd0prv` (OPERADOR) plus QA dealers (`QA5-*`); the owner asked to
keep them. Don't reset `admin`'s password: for a new run, create another admin with `create-admin` (or use
`reset-password --username qa.admin5`) from `../yamaha-consent-api`, and never print the temporary password.
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
  - When adding endpoints, add them to `ENDPOINTS` and `defaultResponse` in the mock. B7 endpoints answer from
    `e2e/fixtures.ts` (stateless, except `PATCH /profile`, which updates `api.user`); override with `respond`.
    `RecordedRequest.query` holds the query parameters.
  - Fields: use `field(page, name)` from `e2e/helpers.ts` (exact accessible name). `getByLabel(..., { exact: true })`
    fails on required fields because the label text includes the hidden " *". Password inputs have no role: use
    `getByLabel`. `detailValue(page, label)` reads a `<dd>`.
  - The audit tests fix the clock (`page.clock.setFixedTime`) for the 7-day default.
  - `MockResponse` can be `{ status, raw, headers, delayMs }` (the Excel export; `delayMs` shows "Exportando...").
    The ubigeo fixtures only use INEI codes quoted in the spec/report (150101, 150501, 070101); never invent others.
    Downloads: `page.waitForEvent("download")`, `download.suggestedFilename()`.
- Single e2e test: `npx playwright test -g "texto"`; one project: `--project=desktop`.
- `@types/node` is pinned to the Node 24 line (`~24.19.2`) and only `tsconfig.node.json`/`tsconfig.test.json` load
  it. `typescript` is pinned to `~6.0.3`: typescript-eslint 8 requires `< 6.1`, and `package.json` `overrides` makes
  openapi-typescript (peer `typescript ^5`) accept it. Check both before upgrading TypeScript.
- `npm audit` reports a high-severity ReDoS in `picomatch` (dev tooling only: Vite, Vitest, typescript-eslint); no
  fixed version exists on 17/11/2026. `npm audit fix --force` would downgrade Vitest: don't run it.
