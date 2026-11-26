/* global document, localStorage, matchMedia */
// Tema antes del primer pintado (spec de rediseño v1.3, 3.2): la elección guardada o, sin ella, la del sistema.
// Archivo aparte y no en línea por la CSP de la sección 8.8 (`script-src 'self'`). El resto (botón, cambios del
// sistema en vivo) está en src/lib/theme.ts, con la misma clave (tests/theme-init.test.ts).
(() => {
  let theme = null;
  try {
    theme = localStorage.getItem("backoffice-theme");
  } catch {
    // Almacenamiento bloqueado: se sigue el sistema.
  }
  if (theme !== "light" && theme !== "dark") {
    theme = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
