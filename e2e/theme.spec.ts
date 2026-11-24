import type { Page } from "@playwright/test";
import { expectHome, heading } from "./helpers";
import { ADMIN, expect, test } from "./mock-api";

/**
 * Rediseño visual (spec 9.3, U1.5 y U1.6): tema claro y oscuro según el sistema operativo (D2), logo oficial por tema
 * (3.8), Figtree autoalojada (3.3, CSP `font-src 'self'`) y favicon nuevo.
 */
const THEMES = {
  light: { canvas: "rgb(248, 250, 252)", logo: /\/assets\/yamaha-logo-light-[\w-]+\.png$/ },
  dark: { canvas: "rgb(11, 17, 32)", logo: /\/assets\/yamaha-logo-dark-[\w-]+\.png$/ },
} as const;

/** `currentSrc` del logo una vez cargado (el navegador elige la fuente del `<picture>` según el tema). */
async function logoSource(page: Page, scope: "banner" | "page"): Promise<string> {
  const root = scope === "banner" ? page.getByRole("banner") : page;
  const logo = root.getByRole("img", { name: "Yamaha" }).first();
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  return logo.evaluate((img: HTMLImageElement) => img.currentSrc);
}

for (const [theme, expected] of Object.entries(THEMES) as [keyof typeof THEMES, (typeof THEMES)[keyof typeof THEMES]][]) {
  test.describe(`tema ${theme === "light" ? "claro" : "oscuro"}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
    });

    test("pantalla pública: fondo canvas y logo del tema", async ({ page }) => {
      await page.goto("/login");
      await expect(heading(page)).toHaveText("Iniciar sesión");
      await expect(page.locator("body")).toHaveCSS("background-color", expected.canvas);
      expect(await logoSource(page, "page")).toMatch(expected.logo);
    });

    test("cabecera con sesión: logo del tema", async ({ page, api }) => {
      api.user = ADMIN;
      await page.goto("/");
      await expectHome(page, "Administrador");
      await expect(page.locator("body")).toHaveCSS("background-color", expected.canvas);
      expect(await logoSource(page, "banner")).toMatch(expected.logo);
    });
  });
}

test("Figtree aplicada al body y servida desde el propio origen", async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? "").origin;
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/login");
  await expect(heading(page)).toHaveText("Iniciar sesión");
  await expect(page.locator("body")).toHaveCSS("font-family", /Figtree/);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(await page.evaluate(() => document.fonts.check('16px "Figtree Variable"'))).toBe(true);

  const fonts = requests.filter((url) => url.endsWith(".woff2"));
  expect(fonts.length).toBeGreaterThan(0);
  for (const url of fonts) expect(url).toMatch(new RegExp(`^${origin}/assets/figtree-[\\w-]+\\.woff2$`));
  // Ninguna petición a terceros (Google Fonts incluido): todo desde el origen del BackOffice o embebido.
  expect(requests.filter((url) => !url.startsWith(`${origin}/`) && !url.startsWith("data:"))).toEqual([]);
});

test.describe("movimiento reducido (3.5)", () => {
  test.use({ reducedMotion: "reduce" });

  test("un botón no tiene transición", async ({ page }) => {
    await page.goto("/login");
    const button = page.getByRole("button", { name: "Ingresar" });
    await expect(button).toBeVisible();
    await expect(button).toHaveCSS("transition-duration", "0s");
  });
});

test("sin movimiento reducido, el botón sí tiene su transición breve", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Ingresar" })).toHaveCSS("transition-duration", "0.15s");
});

test("favicon: emblema de Yamaha en PNG", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.png");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("type", "image/png");
  const response = await page.request.get("/favicon.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/png");
});
