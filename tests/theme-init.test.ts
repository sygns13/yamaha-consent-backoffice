import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Spec de rediseño v1.3, 3.2: public/theme-init.js aplica el tema antes del primer pintado y src/lib/theme.ts lo
// gestiona después; los dos deben leer la misma clave de almacenamiento.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const initScript = read("../public/theme-init.js");
const themeModule = read("../src/lib/theme.ts");
const html = read("../index.html");

describe("tema inicial (theme-init.js)", () => {
  it("usa la misma clave que src/lib/theme.ts", () => {
    const key = /THEME_STORAGE_KEY = "([^"]+)"/.exec(themeModule)?.[1];
    expect(key).toBeDefined();
    expect(initScript).toContain(`localStorage.getItem("${key}")`);
  });

  it("index.html lo carga como script externo y síncrono, antes de la app (CSP: nada en línea)", () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.map(([, attributes]) => attributes?.trim())).toEqual(['src="/theme-init.js"', 'type="module" src="/src/main.tsx"']);
    for (const [, , body] of scripts) expect(body?.trim()).toBe("");
  });
});
