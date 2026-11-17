import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      restoreMocks: true,
      unstubGlobals: true,
      projects: [
        {
          // Componentes y lógica del navegador.
          extends: true,
          test: {
            name: "dom",
            environment: "jsdom",
            include: ["src/**/*.test.{ts,tsx}"],
            setupFiles: ["./src/test/setup.ts"],
          },
        },
        {
          // Reglas del repositorio (leen archivos): tipos generados al día, búsqueda de B6.10, contraste de tokens.
          extends: true,
          test: {
            name: "node",
            environment: "node",
            include: ["tests/**/*.test.ts"],
          },
        },
      ],
    },
  }),
);
