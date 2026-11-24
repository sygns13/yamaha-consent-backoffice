import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config.ts";

// Galería de capturas para revisión humana (spec de rediseño, 9.5): mismo build, preview y API simulada que los e2e,
// solo e2e/capturas.spec.ts y un único proyecto Chromium (cada captura fija su ancho y su tema).
export default defineConfig({
  ...base,
  testMatch: "capturas.spec.ts",
  testIgnore: [],
  projects: [{ name: "capturas", use: { ...devices["Desktop Chrome"] } }],
});
