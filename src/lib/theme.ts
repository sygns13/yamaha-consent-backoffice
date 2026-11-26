import { useSyncExternalStore } from "react";

/**
 * Tema claro u oscuro (spec de rediseño v1.3, 3.2 y 5.2): sin elección, el del sistema operativo; con el botón de la
 * cabecera, el elegido, recordado en este navegador. Es una preferencia de pantalla, no un dato de sesión.
 * `public/theme-init.js` aplica el mismo cálculo antes del primer pintado (debe usar la misma clave; lo comprueba
 * `tests/theme-init.test.ts`). El tema vive en `<html data-theme="light|dark">`, que es lo que lee global.css.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "backoffice-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Almacenamiento bloqueado (modo privado estricto): se sigue el sistema.
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Color de la barra del navegador en móvil: el `surface` del tema aplicado (sin hex en el código). */
function syncThemeColor() {
  const surface = getComputedStyle(document.documentElement).getPropertyValue("--color-surface").trim();
  if (surface === "") return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.removeAttribute("media");
    meta.content = surface;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  syncThemeColor();
  for (const listener of listeners) listener();
}

/** Guarda la elección del usuario y la aplica. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sin almacenamiento, el cambio vale solo para esta página.
  }
  applyTheme(theme);
}

/**
 * Se llama una vez en `main.tsx`. Sin elección guardada sigue los cambios del sistema en vivo; una elección hecha
 * en otra pestaña se aplica aquí también.
 */
export function initTheme() {
  applyTheme(storedTheme() ?? systemTheme());
  window.matchMedia?.(DARK_QUERY).addEventListener("change", () => {
    if (storedTheme() === null) applyTheme(systemTheme());
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY) applyTheme(storedTheme() ?? systemTheme());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tema aplicado; el componente se vuelve a pintar cuando cambia. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme);
}
