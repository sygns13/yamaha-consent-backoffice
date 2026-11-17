import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Criterio B6.10 (sección 8.1): búsqueda en src/. ESLint ya bloquea alert/confirm/fetch (eslint.config.js); esta
// búsqueda también revisa comentarios y textos.
const SRC = fileURLToPath(new URL("../src", import.meta.url));
const GENERATED = "lib/api-schema.d.ts";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(SRC)
  .map((path) => ({ path: relative(SRC, path).split(sep).join("/"), text: readFileSync(path, "utf8") }))
  .filter((file) => file.path !== GENERATED);

function matches(pattern: RegExp, candidates = files): string[] {
  return candidates.flatMap((file) =>
    file.text.split("\n").flatMap((line, index) => (pattern.test(line) ? [`${file.path}:${index + 1}: ${line.trim()}`] : [])),
  );
}

describe("reglas del repositorio en src/ (B6.10)", () => {
  it("revisa los archivos de src/", () => {
    expect(files.map((file) => file.path)).toContain("lib/api.ts");
  });

  it("sin window.alert ni window.confirm", () => {
    expect(matches(/\bwindow\.(alert|confirm)\b|(^|[^.\w])(alert|confirm)\s*\(/)).toEqual([]);
  });

  it("sin fetch fuera de src/lib/api.ts", () => {
    expect(matches(/\bfetch\s*\(/, files.filter((file) => file.path !== "lib/api.ts"))).toEqual([]);
  });

  it("sin colores hex en el código (los colores son tokens de src/styles/global.css)", () => {
    const code = files.filter((file) => !/\.test\.tsx?$/.test(file.path));
    expect(matches(/#[0-9a-fA-F]{3,8}\b/, code)).toEqual([]);
  });
});
