import type { Locator } from "@playwright/test";
import { heading, openRowActions, rowActionsTrigger } from "./helpers";
import { ADMIN, expect, test } from "./mock-api";

/**
 * "Más acciones" de las filas de las listas (spec de rediseño, D4, 4.23 y 9.3; V16 y V18 del reporte): panel con la
 * Popover API (`popover="auto"`), foco, cierre nativo (Escape y clic afuera) y posición solo con CSS: hoja inferior
 * bajo `sm` (proyecto `mobile`) y anclado al disparador con *anchor positioning* desde `sm` (proyecto `desktop`).
 */
test.beforeEach(({ api }) => {
  api.user = ADMIN;
});

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("El elemento no tiene caja");
  return box;
}

test("al abrir, el foco va al primer ítem; Tab recorre los ítems (no es role=menu)", async ({ page }) => {
  await page.goto("/usuarios");
  const panel = await openRowActions(page, "jperez");

  await expect(panel.getByRole("button", { name: "Desactivar jperez" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "Generar contraseña temporal jperez" })).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("menuitem")).toHaveCount(0);
});

test("Escape cierra el panel y la Popover API devuelve el foco al disparador", async ({ page }) => {
  await page.goto("/usuarios");
  const trigger = rowActionsTrigger(page, "jperez");
  const panel = await openRowActions(page, "jperez");
  const panelId = await trigger.getAttribute("popovertarget");

  // V18: en la fase de captura del `toggle` de cierre (antes del respaldo del componente) se registra dónde quedó el
  // foco: así se ve el comportamiento nativo y no el respaldo.
  await page.evaluate((id) => {
    const state = window as Window & { focusOnTriggerAtClose?: boolean };
    document.addEventListener(
      "toggle",
      (event) => {
        if (event.target instanceof HTMLElement && event.target.id === id && event.newState === "closed") {
          state.focusOnTriggerAtClose = document.activeElement?.getAttribute("popovertarget") === id;
        }
      },
      { capture: true },
    );
  }, panelId);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => (window as Window & { focusOnTriggerAtClose?: boolean }).focusOnTriggerAtClose)).toBe(true);
});

test("el clic afuera cierra el panel", async ({ page }) => {
  await page.goto("/usuarios");
  const panel = await openRowActions(page, "jperez");

  await heading(page).click();
  await expect(panel).toBeHidden();
  await expect(rowActionsTrigger(page, "jperez")).toHaveAttribute("aria-expanded", "false");
});

test("visible y dentro del viewport: hoja inferior en móvil, anclado al disparador y sin recorte en escritorio", async ({
  page,
}) => {
  await page.goto("/usuarios");
  const trigger = rowActionsTrigger(page, "cruiz");
  const panel = await openRowActions(page, "cruiz");
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("Sin viewport");
  // Se mide al terminar la entrada animada (`starting:open:translate-y-1` → 0, 200 ms).
  await panel.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  const box = await boxOf(panel);

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  // En la top layer nada lo tapa ni lo recorta (ni el `overflow` de la tabla ni la columna fija): las cuatro esquinas
  // (dentro del radio del borde) son del panel.
  const painted = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const inset = 8;
    const corners = [
      [rect.left + inset, rect.top + inset],
      [rect.right - inset, rect.top + inset],
      [rect.left + inset, rect.bottom - inset],
      [rect.right - inset, rect.bottom - inset],
    ] as const;
    return corners.every(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && element.contains(hit);
    });
  });
  expect(painted).toBe(true);

  if (viewport.width < 640) {
    // Hoja inferior a todo el ancho: `inset: auto 0.5rem 0.5rem 0.5rem` (`.row-actions-panel`).
    expect(Math.round(box.x)).toBe(8);
    expect(Math.round(viewport.width - (box.x + box.width))).toBe(8);
    expect(Math.round(viewport.height - (box.y + box.height))).toBe(8);
  } else {
    // V16: Chromium soporta anchor positioning; `position-area: bottom span-left` alinea el borde derecho con el del
    // disparador, debajo o, si no cabe, encima (`position-try-fallbacks: flip-block`).
    expect(await page.evaluate(() => CSS.supports("anchor-name: --a"))).toBe(true);
    const anchor = await boxOf(trigger);
    expect(Math.abs(box.x + box.width - (anchor.x + anchor.width))).toBeLessThanOrEqual(1);
    const below = box.y >= anchor.y + anchor.height - 1;
    const above = box.y + box.height <= anchor.y + 1;
    expect(below || above).toBe(true);
  }
});

test("Eliminar → ConfirmDialog → Cancelar devuelve el foco al disparador", async ({ page, api }) => {
  await page.goto("/dealers");
  const panel = await openRowActions(page, "CL0001");
  await panel.getByRole("button", { name: "Eliminar CL0001" }).click();

  const dialog = page.getByRole("dialog", { name: "¿Eliminar el dealer CL0001?" });
  await expect(dialog).toBeVisible();
  await expect(panel).toBeHidden();
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await expect(dialog).toBeHidden();
  await expect(rowActionsTrigger(page, "CL0001")).toBeFocused();
  expect(api.calls("dealerDelete")).toHaveLength(0);
});
