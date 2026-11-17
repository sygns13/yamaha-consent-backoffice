import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Reglas del repositorio (sección 8.1): ningún fetch fuera de src/lib/api.ts y nunca window.alert ni window.confirm.
const FETCH_ONLY_IN_API = "Toda llamada a la API pasa por src/lib/api.ts (sección 8.1).";
const NO_NATIVE_DIALOGS = "Usa ConfirmDialog, Alert o Toast (sección 8.1).";
const restrictedGlobals = (allowFetch) => [
  "error",
  { name: "alert", message: NO_NATIVE_DIALOGS },
  { name: "confirm", message: NO_NATIVE_DIALOGS },
  ...(allowFetch ? [] : [{ name: "fetch", message: FETCH_ONLY_IN_API }]),
];
const restrictedProperties = (allowFetch) => [
  "error",
  { object: "window", property: "alert", message: NO_NATIVE_DIALOGS },
  { object: "window", property: "confirm", message: NO_NATIVE_DIALOGS },
  ...(allowFetch
    ? []
    : [
        { object: "window", property: "fetch", message: FETCH_ONLY_IN_API },
        { object: "globalThis", property: "fetch", message: FETCH_ONLY_IN_API },
      ]),
];

export default defineConfig([
  globalIgnores(["dist", "dist-e2e", "test-results", "playwright-report", "src/lib/api-schema.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    rules: {
      "no-restricted-globals": restrictedGlobals(false),
      "no-restricted-properties": restrictedProperties(false),
    },
  },
  {
    files: ["src/lib/api.ts"],
    rules: {
      "no-restricted-globals": restrictedGlobals(true),
      "no-restricted-properties": restrictedProperties(true),
    },
  },
  {
    // Los tests reemplazan fetch con vi.stubGlobal y pueden exportar utilidades.
    files: ["src/**/*.test.{ts,tsx}", "src/test/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
  },
]);
