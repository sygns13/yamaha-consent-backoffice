# yamaha-consent-backoffice

BackOffice web de Consentimientos Yamaha (Perú): inicio de sesión, recuperación y cambio de contraseña, Inicio por
rol, Gestión de Dealers (con exportación a Excel), Usuarios, Mi perfil y Bitácora.

- Especificación (fuente de verdad): [`../requerimientos/BACKOFFICE_DEALERS.spec.md`](../requerimientos/BACKOFFICE_DEALERS.spec.md), sección 8.
- Avance por fase y criterio: [`../REPORTE_CRITERIOS_BACKOFFICE.md`](../REPORTE_CRITERIOS_BACKOFFICE.md).
- API: `yamaha-consent-api`, endpoints `/api/v1/backoffice/*`. Contrato: [`docs/openapi.json`](docs/openapi.json).

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| B6 | Base, autenticación, guardas, Inicio, 403 y 404 | ✅ |
| B7 | Usuarios, Mi perfil y Bitácora | ✅ |
| B8 | Dealers | ✅ |
| B9 | Despliegue: `firebase.json`, `.firebaserc`, VPS de pruebas (17/11/2026) | ✅ VPS · Producción pendiente (B9.3) |

## Stack

React 19 · Vite 8 · TypeScript 6 estricto · React Router 8 · TanStack Query 5 · react-hook-form 7 + zod 4 ·
Tailwind CSS 4 · Vitest + Testing Library · Playwright + axe. Node 24 LTS (mínimo 22.23.4). Versiones fijadas en
`package-lock.json`.

## Comandos

```powershell
npm ci                 # dependencias exactas del lock
npm run dev            # http://localhost:5173, con proxy /api → http://localhost:8000
npm run build          # tsc -b + vite build → dist/
npm run preview        # sirve dist/ con las cabeceras de seguridad (CSP) de la sección 8.8
npm run lint           # ESLint
npm run test           # Vitest (unitarios + reglas del repositorio)
npm run test:e2e       # Playwright: build en dist-e2e/, preview en el puerto 4323, API simulada
npm run api:types      # regenera src/lib/api-schema.d.ts desde docs/openapi.json
```

La primera vez, antes de `npm run test:e2e`: `npx playwright install chromium`.

## Variables de entorno (build)

| Variable | Descripción |
|---|---|
| `VITE_ENVIRONMENT_LABEL` | Opcional. Distintivo de entorno en la cabecera (p. ej. `PRUEBAS` en el VPS). Vacío en Producción |

No hay URL de la API: el navegador llama siempre a rutas relativas `/api/v1/backoffice/...` en el mismo origen
(sección 2.3). Copia `.env.example` a `.env` si quieres el distintivo en local.

## Probar en local contra la API real

1. En `../yamaha-consent-api`: PostgreSQL arriba y migrado, y un Administrador creado con la CLI (sección 10.1):

   ```powershell
   uv run python -m app.cli.backoffice create-admin --dni 00000000 --first-names "Administrador" `
     --last-names "General" --username admin --email admin@backoffice.local
   uv run uvicorn app.main:app --reload --port 8000
   ```

   El `.env` de la API necesita `BACKOFFICE_SESSION_COOKIE_SECURE=false` (si no, el navegador no envía la cookie
   `Secure` por `http://localhost`). Para recibir el correo de recuperación en Mailpit (`http://localhost:8025`), también
   los bloques "BackOffice" y "Correo del BackOffice" de su `.env.example`.
2. Aquí: `npm run dev` y abrir `http://localhost:5173`. Vite reenvía `/api` a la API, así que la cookie `__session` es
   de primera parte.

## Tipos de la API

`docs/openapi.json` es la instantánea del OpenAPI del backend. Cuando la API cambia:

```powershell
# desde ../yamaha-consent-api
uv run python -m scripts.export_openapi ../yamaha-consent-backoffice/docs/openapi.json
# desde aquí
npm run api:types
```

`src/lib/api-schema.d.ts` se versiona; `tests/api-types.test.ts` falla si no coincide con `docs/openapi.json`.

## Pruebas

- **Unitarias** (`src/**/*.test.ts(x)`, jsdom): cliente de la API (cabeceras, timeout de 15 s, errores, query de las
  listas), `next` seguro, política de contraseñas, validadores espejo de la API (DNI, nombres, usuario, correo,
  celular, RUC, teléfono de contacto), esquemas zod, filtros en la URL, exportación (nombre del archivo, timeout de
  60 s, enlace de descarga), sesión y manejo global de 401/403, componentes (diálogos, tabla, paginación, búsqueda
  con *debounce*).
- **Reglas del repositorio** (`tests/`, Node): tipos generados al día, búsqueda del criterio B6.10 (sin
  `window.alert`/`window.confirm`, sin `fetch` fuera de `src/lib/api.ts`, sin hex en el código), contraste AA de los
  tokens de color y `firebase.json` coherente con la sección 8.8 (`tests/hosting-headers.test.ts`: las cabeceras de
  `SECURITY_HEADERS` de `vite.config.ts` más HSTS, el rewrite de `/api/v1/backoffice/**` a Cloud Run y el resto a
  `index.html`).
- **e2e** (`e2e/`): la API se simula con `page.route` (`e2e/mock-api.ts`, datos en `e2e/fixtures.ts`); cada test
  corre en los proyectos `mobile` (Pixel 7) y `desktop`. Por pantalla: `login`, `password-recovery`, `session`,
  `users`, `profile`, `audit`, `dealers` y `a11y`. El fixture `api` falla el test si una mutación no lleva `X-Requested-With`, si queda una
  petición sin simular, si la CSP bloquea algo o si la página lanza un error. `e2e/a11y.spec.ts` corre axe (WCAG 2.2 AA)
  a 360, 768 y 1280 px y verifica que no haya scroll horizontal.

## Despliegue

Manual, sin CI/CD (sección 10 del spec). No ejecutar `firebase deploy` ni nada en los servidores salvo pedido
explícito. En ningún entorno hay URL de API en el build: el sitio reenvía `/api/v1/backoffice/*` a la API en su mismo
origen (sección 2.3), así que la cookie `__session` es de primera parte.

### Producción: Firebase Hosting (sitio `consent-backoffice`)

- `firebase.json` (sección 8.8): `target` `backoffice`, `public` `dist`, rewrite de `/api/v1/backoffice/**` al servicio
  de Cloud Run `consent-api` y el resto a `/index.html`; cabeceras de seguridad (las de `vite.config.ts` + HSTS);
  `no-cache` en las rutas y caché de un año en `/assets/**`.
- `.firebaserc`: alias `prod` y target `backoffice` → sitio `consent-backoffice`.
- **Placeholders** que se reemplazan en el primer deploy (no hay valores reales todavía):
  - `firebase.json`: `"region": "<REGION>"` = la región de Cloud Run (PENDIENTE-09; debe ser una región que Firebase
    Hosting admita para rewrites a Cloud Run).
  - `.firebaserc`: `<PROJECT_ID>` (dos veces). Si el ID de sitio `consent-backoffice` está tomado, otro.
- Dominio propio: PENDIENTE-18. Mientras tanto, la URL técnica `https://consent-backoffice.web.app`. Ningún dominio
  productivo se escribe en este repo.

```powershell
firebase login
firebase hosting:sites:create consent-backoffice
firebase target:apply hosting backoffice consent-backoffice
npm ci
npm run build                          # VITE_ENVIRONMENT_LABEL vacío en Producción
firebase deploy --only hosting:backoffice   # no toca la landing
```

Verificación (B9.3): cabeceras de la 8.8 en el sitio, `Cache-Control: no-store` en `/api/v1/backoffice/*` (si llega
`no-cache`, la regla `regex` de `firebase.json` la pisó), cookie `__session` con `Secure` y `/auth/me` → `200` tras
el login. Rollback: `firebase hosting:rollback` eligiendo este sitio. Orden completo con la API, las migraciones, el
secreto `SMTP_PASSWORD` y el primer Administrador: `../GUIA_DESPLIEGUE_PRODUCCION_GCP.md`, sección 19.

### VPS de pruebas (Hostinger)

Desplegado el 17/11/2026 en `https://consentimientos-bo-test.bcscode.com` (`../GUIA_DESPLIEGUE_VPS_PRUEBAS.md`,
sección 13). La imagen se construye **en el VPS** con un `Dockerfile` que vive fuera de este repo
(`/var/www/consentimientos-test/backoffice/`): etapa `node:24-slim` (`npm ci` + `npm run build` con
`VITE_ENVIRONMENT_LABEL=PRUEBAS`) y etapa final `nginx:1.28-alpine` con `dist/`. Su `nginx.conf` sirve las mismas
cabeceras que `firebase.json`, `try_files $uri /index.html`, `/assets/` con caché de un año, `no-cache` en el resto y
`gzip`. Traefik envía `/api/v1/backoffice/*` de ese dominio al contenedor de la API.

```bash
# En el VPS, para publicar una versión nueva
cd /var/www/consentimientos-test
git -C yamaha-consent-backoffice pull --ff-only
docker compose build backoffice && docker compose up -d backoffice
```
