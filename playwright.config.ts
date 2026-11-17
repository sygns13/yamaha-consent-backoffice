import { defineConfig, devices } from "@playwright/test";

const PORT = 4323;

// Pruebas e2e contra el build de producción, sin backend: la API se simula con page.route (e2e/mock-api.ts).
// El build va a dist-e2e/ para no pisar dist/ y el preview sirve las cabeceras de la sección 8.8 (vite.config.ts),
// incluida la CSP.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/login`,
    // Siempre un build nuevo: un servidor ya abierto en el puerto podría servir otro build.
    reuseExistingServer: false,
    timeout: 120_000,
    // Las variables del proceso tienen prioridad sobre .env: el build no depende del .env local.
    env: { VITE_ENVIRONMENT_LABEL: "PRUEBAS" },
  },
});
