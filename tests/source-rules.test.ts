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

// Spec de rediseño, 9.2: reglas del sistema de diseño. Tailwind ignora en silencio las clases que no generan CSS
// (con `--color-*: initial`, `bg-white` ya no existe), por eso se buscan en el código.
const PALETTE_UTILITIES =
  "bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|placeholder|decoration|accent|caret";
const PALETTE_COLORS =
  "slate|zinc|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|" +
  "fuchsia|pink|rose|white|black";

describe("reglas del sistema de diseño en src/ (rediseño, 9.2)", () => {
  it("sin clases de la paleta de Tailwind (con o sin número, con cualquier variante delante)", () => {
    const palette = new RegExp(`(^|[^\\w-])(${PALETTE_UTILITIES})-(${PALETTE_COLORS})(-\\d{2,3})?(/\\d+)?(?![\\w-])`);
    expect(matches(palette)).toEqual([]);
  });

  it("sin los tokens eliminados brand y brand-dark", () => {
    expect(matches(/-brand(-dark)?(?![\w-])/)).toEqual([]);
  });

  it("sin la prop style en TSX (CSP de la 8.8)", () => {
    const tsx = files.filter((file) => file.path.endsWith(".tsx"));
    expect(matches(/\bstyle=[{"]/, tsx)).toEqual([]);
  });

  it("sin transition-all (anima medidas y provoca saltos)", () => {
    expect(matches(/\btransition-all\b/)).toEqual([]);
  });

  it("dark: solo para sombras, nunca con una utilidad de color", () => {
    expect(matches(/\bdark:(bg|text|border|ring|outline|fill|stroke)-/)).toEqual([]);
  });

  it("sin <svg> escritos a mano (todos los íconos son de lucide, desde U2)", () => {
    expect(matches(/<svg\b/)).toEqual([]);
  });

  it("íconos de lucide importados uno por uno", () => {
    expect(matches(/import\s+\*\s+as\s+\w+\s+from\s+["']lucide-react|lucide-react\/dynamic|\bDynamicIcon\b/)).toEqual([]);
  });
});
