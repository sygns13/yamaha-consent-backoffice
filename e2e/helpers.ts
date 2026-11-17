import { expect, type Page } from "@playwright/test";

export const NETWORK_ERROR_TEXT = "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.";
export const VALID_PASSWORD = "Clave#2026";

export function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

export async function fillLogin(page: Page, username: string, password: string): Promise<void> {
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}

export async function expectHome(page: Page, firstNames: string): Promise<void> {
  await expect(page).toHaveURL(/\/$/);
  await expect(heading(page)).toHaveText(`Hola, ${firstNames}`);
}

export function mainMenu(page: Page) {
  return page.getByRole("navigation", { name: "Menú principal" });
}

/** Bajo 1024 px el menú lateral es un panel desplegable (sección 8.5): se abre con el botón "Menú". */
export async function openMainMenu(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    const toggle = page.getByRole("button", { name: "Menú", exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(mainMenu(page)).toBeVisible();
}

export async function openUserMenu(page: Page, fullName: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(fullName) }).click();
}

/** La página nunca tiene scroll horizontal (sección 8.7). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
