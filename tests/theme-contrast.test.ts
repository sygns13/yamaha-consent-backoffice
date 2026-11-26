import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Spec de rediseño, 3.2 y 9.1: tokens de color del tema claro (@theme) y del oscuro (bloque :root[data-theme="dark"],
// v1.3), con el mismo juego de nombres, un hex de 6 dígitos en minúsculas cada uno y contraste WCAG 2.x verificado.
// Sin comentarios: solo cuentan las declaraciones.
const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const TOKENS = [
  "canvas",
  "surface",
  "surface-muted",
  "surface-raised",
  "border",
  "border-strong",
  "fg",
  "fg-muted",
  "fg-subtle",
  "primary",
  "primary-hover",
  "on-primary",
  "primary-text",
  "primary-subtle",
  "brand-panel",
  "ring",
  "accent",
  "danger",
  "danger-surface",
  "danger-fill",
  "danger-fill-hover",
  "on-danger",
  "success",
  "success-surface",
  "warning",
  "warning-surface",
  "overlay",
] as const;
type Token = (typeof TOKENS)[number];
type Theme = "light" | "dark";

function block(pattern: RegExp, name: string): string {
  const match = pattern.exec(css);
  if (match?.[1] === undefined) throw new Error(`No se encontró el bloque ${name} en global.css`);
  return match[1];
}

const BLOCKS: Record<Theme, string> = {
  light: block(/@theme\s*\{([\s\S]*?)\n\}/, "@theme"),
  dark: block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/, "oscuro"),
};

/** Cada declaración `--color-*` del bloque, en orden (para detectar repetidas). */
function declarations(theme: Theme): [string, string][] {
  return [...BLOCKS[theme].matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m): [string, string] => [m[1] ?? "", (m[2] ?? "").trim()]);
}

const PALETTE: Record<Theme, Record<string, string>> = {
  light: Object.fromEntries(declarations("light")),
  dark: Object.fromEntries(declarations("dark")),
};

function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

function color(theme: Theme, name: Token): string {
  const value = PALETTE[theme][name];
  if (value === undefined) throw new Error(`Falta el token --color-${name} en el tema ${theme}`);
  return value;
}

/**
 * Pares de la tabla "Contraste verificado" de la 3.2, más `on-primary` sobre `brand-panel` (9.1) y `success` sobre
 * `surface-muted` (checklist de Restablecer en un recuadro `bg-surface-muted`, 6.1; aprobado el 23/11/2026).
 */
const TEXT_PAIRS: [Token, Token][] = [
  ...(["fg", "fg-muted", "fg-subtle"] as const).flatMap((text) =>
    (["canvas", "surface", "surface-muted", "surface-raised"] as const).map((bg): [Token, Token] => [text, bg]),
  ),
  ["on-primary", "primary"],
  ["on-primary", "primary-hover"],
  ["on-primary", "brand-panel"],
  ...(["canvas", "surface", "surface-muted", "surface-raised", "primary-subtle"] as const).map(
    (bg): [Token, Token] => ["primary-text", bg],
  ),
  ["on-danger", "danger-fill"],
  ["on-danger", "danger-fill-hover"],
  ["danger", "danger-surface"],
  ["danger", "surface"],
  ["danger", "canvas"],
  ["success", "success-surface"],
  ["success", "surface"],
  ["success", "surface-muted"],
  ["warning", "warning-surface"],
  ["warning", "surface"],
];

/** No texto (WCAG 1.4.11): bordes de inputs e indicador de foco. */
const NON_TEXT_PAIRS: [Token, Token][] = [
  ["border-strong", "surface"],
  ["border-strong", "canvas"],
  ["border-strong", "surface-muted"],
  ["ring", "canvas"],
  ["ring", "surface"],
  ["ring", "surface-muted"],
  ["ring", "primary-subtle"],
];

describe.each(["light", "dark"] as const)("tokens de color, tema %s", (theme) => {
  it("define exactamente los tokens de la 3.2, una vez cada uno", () => {
    const names = declarations(theme).map(([name]) => name);
    expect([...names].sort()).toEqual([...TOKENS].sort());
  });

  it("cada token es un hex de 6 dígitos en minúsculas", () => {
    for (const [name, value] of declarations(theme)) expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(TEXT_PAIRS)("%s sobre %s ≥ 4.5:1", (text, background) => {
    expect(contrast(color(theme, text), color(theme, background))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)("%s contra %s ≥ 3:1", (foreground, background) => {
    expect(contrast(color(theme, foreground), color(theme, background))).toBeGreaterThanOrEqual(3);
  });
});

describe("decisiones del responsable", () => {
  it("D1: azul corporativo de Yamaha y rojo de acento en el tema claro", () => {
    expect(PALETTE.light).toMatchObject({
      primary: "#003087",
      "primary-hover": "#001f5c",
      ring: "#0040b0",
      accent: "#e60012",
    });
  });

  it("D6: la paleta por defecto de Tailwind está desactivada", () => {
    expect(BLOCKS.light).toMatch(/--color-\*:\s*initial;/);
  });

  it("sin @theme inline (las utilidades deben leer var(--color-…))", () => {
    expect(css).not.toMatch(/@theme\s+inline/);
  });
});
