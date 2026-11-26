import type { Page } from "@playwright/test";
import { DEALERS, page as pageOf } from "./fixtures";
import { expectHome, heading, openRowActions } from "./helpers";
import { ADMIN, expect, NEW_ADMIN, test } from "./mock-api";

/**
 * Rediseño visual (spec 9.3, U1.5 y U1.6): tema claro y oscuro según el sistema operativo (D2) o el botón de la
 * cabecera (v1.3), logo oficial por tema (3.8), Figtree autoalojada (3.3, CSP `font-src 'self'`) y favicon nuevo.
 */
const THEMES = {
  light: { canvas: "rgb(248, 250, 252)", brandPanel: "rgb(0, 48, 135)", logo: /\/assets\/yamaha-logo-light-[\w-]+\.png$/ },
  dark: { canvas: "rgb(11, 17, 32)", brandPanel: "rgb(10, 22, 51)", logo: /\/assets\/yamaha-logo-dark-[\w-]+\.png$/ },
} as const;
const INVERSE_LOGO = /\/assets\/yamaha-logo-inverse-[\w-]+\.png$/;

/** `currentSrc` del logo una vez cargado (la imagen del tema aplicado). */
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
      // Bajo `lg` (desde U3, P6): logo y producto sobre la tarjeta. Desde `lg` se ve el panel de marca (test de abajo).
      await page.setViewportSize({ width: 768, height: 800 });
      await page.goto("/login");
      await expect(heading(page)).toHaveText("Iniciar sesión");
      await expect(page.locator("body")).toHaveCSS("background-color", expected.canvas);
      expect(await logoSource(page, "page")).toMatch(expected.logo);
    });

    test("pantalla pública desde lg: panel de marca con el logo inverso (P6)", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/login");
      await expect(heading(page)).toHaveText("Iniciar sesión");
      await expect(page.getByRole("banner")).toHaveCSS("background-color", expected.brandPanel);
      expect(await logoSource(page, "banner")).toMatch(INVERSE_LOGO);
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

// v1.3 (pedido del responsable, 26/11/2026): botón de tema en la cabecera; sin elección, el del sistema.
test.describe("botón de tema de la cabecera", () => {
  test.beforeEach(async ({ page, api }) => {
    api.user = ADMIN;
    await page.emulateMedia({ colorScheme: "light" });
  });

  test("alterna claro y oscuro, cambia el logo y se recuerda al recargar y en el login", async ({ page, api }) => {
    await page.goto("/");
    await expectHome(page, "Administrador");
    const banner = page.getByRole("banner");
    await banner.getByRole("button", { name: "Cambiar a tema oscuro", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.dark.canvas);
    expect(await logoSource(page, "banner")).toMatch(THEMES.dark.logo);
    await expect(banner.getByRole("button", { name: "Cambiar a tema claro", exact: true })).toBeFocused();

    await page.reload();
    await expectHome(page, "Administrador");
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.dark.canvas);

    api.user = null;
    await page.goto("/login");
    await expect(heading(page)).toHaveText("Iniciar sesión");
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.dark.canvas);
  });

  test("sin elección sigue al sistema en vivo; con elección, ya no", async ({ page }) => {
    await page.goto("/");
    await expectHome(page, "Administrador");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.dark.canvas);

    await page.getByRole("banner").getByRole("button", { name: "Cambiar a tema claro", exact: true }).click();
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.light.canvas);
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.light.canvas);
  });

  test("cambio de contraseña obligatorio: desde sm sí; bajo sm no cabe junto a Cerrar sesión", async ({ page, api }) => {
    api.user = NEW_ADMIN;
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto("/cambiar-contrasena");
    const toggle = page.getByRole("banner").getByRole("button", { name: "Cambiar a tema oscuro", exact: true });
    await toggle.click();
    await expect(page.locator("body")).toHaveCSS("background-color", THEMES.dark.canvas);

    await page.setViewportSize({ width: 360, height: 800 });
    await expect(page.getByRole("banner").getByRole("button", { name: "Cambiar a tema claro", exact: true })).toBeHidden();
    await expect(page.getByRole("banner").getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });
});

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

  // U4.3: tampoco en menús, paneles y diálogos (entradas con @starting-style), ni en el pulso del skeleton.
  test("menús, panel de Más acciones y diálogo sin transición", async ({ page, api }) => {
    api.user = ADMIN;
    await page.goto("/dealers");
    await page.getByRole("button", { name: /Administrador General/ }).click();
    const userMenu = page.getByRole("link", { name: "Mi perfil" }).locator("xpath=ancestor::div[@id][1]");
    await expect(userMenu).toBeVisible();
    await expect(userMenu).toHaveCSS("transition-duration", "0s");
    await page.keyboard.press("Escape");

    const panel = await openRowActions(page, "CL0001");
    await expect(panel).toHaveCSS("transition-duration", "0s");
    await panel.getByRole("button", { name: "Eliminar CL0001" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar el dealer CL0001?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("transition-duration", "0s");
  });

  test("el skeleton no pulsa; el spinner sigue girando (indicador esencial)", async ({ page, api }) => {
    api.user = ADMIN;
    api.respond("dealers", { status: 200, body: pageOf(DEALERS), delayMs: 1_500 });
    await page.goto("/dealers");
    const bar = page.getByRole("status", { name: "Dealers" }).locator(".animate-pulse").first();
    await expect(bar).toBeAttached();
    await expect(bar).toHaveCSS("animation-name", "none");
    await expect(page.getByRole("table")).toBeVisible();

    api.respond("dealerExport", {
      status: 200,
      raw: "x",
      delayMs: 1_500,
      headers: { "Content-Type": "application/octet-stream", "Content-Disposition": 'attachment; filename="d.xlsx"' },
    });
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar a Excel" }).click();
    const exporting = page.getByRole("button", { name: "Exportando..." });
    await expect(exporting.locator("svg")).toHaveCSS("animation-name", "spin");
    await download;
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
