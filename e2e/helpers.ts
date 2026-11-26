import { expect, type Locator, type Page } from "@playwright/test";

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

/** Disparador "Más acciones {registro}" de una fila de lista (spec de rediseño, D4 y 4.23). */
export function rowActionsTrigger(page: Page, record: string): Locator {
  return page.getByRole("button", { name: `Más acciones ${record}`, exact: true });
}

/**
 * Abre "Más acciones {registro}" de una fila (spec de rediseño, 9.3): en las listas, Activar, Desactivar, Desbloquear,
 * Generar contraseña temporal y Eliminar están en ese panel. Devuelve el panel (el elemento `popover` del disparador).
 */
export async function openRowActions(page: Page, record: string): Promise<Locator> {
  const trigger = rowActionsTrigger(page, record);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const panelId = await trigger.getAttribute("popovertarget");
  const panel = page.locator(`[id="${panelId ?? ""}"]`);
  await expect(panel).toBeVisible();
  return panel;
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

/** Valor (`<dd>`) de un dato en una vista de detalle (`<dl>`), por su etiqueta exacta. */
export function detailValue(page: Page, label: string) {
  const exact = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  return page.locator("dt", { hasText: exact }).locator("xpath=following-sibling::dd[1]");
}

/**
 * Campo de formulario por su nombre accesible exacto. `getByLabel(..., { exact: true })` compara el texto del
 * `<label>`, que en los obligatorios incluye el " *" (oculto para lectores de pantalla).
 */
export function field(page: Page, name: string) {
  return page
    .getByRole("textbox", { name, exact: true })
    .or(page.getByRole("combobox", { name, exact: true }))
    .or(page.getByRole("searchbox", { name, exact: true }));
}
