import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Cabeceras de seguridad de la sección 8.8, aplicadas a `vite preview`. Así los e2e corren con la misma CSP que
 * Producción: un script o estilo en línea rompe las pruebas. `tests/hosting-headers.test.ts` comprueba que
 * firebase.json tenga exactamente estas más Strict-Transport-Security, que aquí no va: el preview es http y el
 * navegador la ignora.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; " +
    "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Mismo origen (sección 2.3): el navegador llama a /api/v1/backoffice/... y Vite lo reenvía a la API local.
    proxy: { "/api": "http://localhost:8000" },
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
});
