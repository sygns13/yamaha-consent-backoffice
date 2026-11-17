import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Sección 8.1: success/success-surface y warning/warning-surface con contraste AA verificado (texto normal: 4.5:1).
const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const tokens: Record<string, string> = Object.fromEntries(
  [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m): [string, string] => [m[1] ?? "", m[2] ?? ""]),
);
const WHITE = "#ffffff";

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

function token(name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`Falta el token --color-${name}`);
  return value;
}

describe("tokens de color", () => {
  it("tiene los tokens de la landing con sus valores", () => {
    expect(tokens).toMatchObject({
      brand: "#3224ff",
      "brand-dark": "#2418d6",
      surface: "#f2f3f6",
      danger: "#b91c1c",
      "danger-surface": "#fef2f2",
    });
  });

  it.each([
    ["danger", "danger-surface"],
    ["success", "success-surface"],
    ["warning", "warning-surface"],
    ["brand", "surface"],
  ])("%s sobre %s ≥ 4.5:1", (text, background) => {
    expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["brand", "brand-dark", "danger", "success", "warning"])("%s sobre blanco (y blanco sobre %s) ≥ 4.5:1", (name) => {
    expect(contrast(token(name), WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});
