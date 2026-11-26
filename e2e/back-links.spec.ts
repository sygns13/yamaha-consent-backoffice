import { ACTIVE_USER, DEALER_LIMA } from "./fixtures";
import { expectHome, heading } from "./helpers";
import { ADMIN, expect, test } from "./mock-api";

/**
 * Enlaces "Volver" (spec de rediseño v1.3, pedido del responsable el 26/11/2026): cada lista de módulo vuelve a
 * Inicio y cada detalle vuelve a la lista de su módulo, con una ruta fija (no el historial).
 */
test.beforeEach(({ api }) => {
  api.user = ADMIN;
});

for (const [path, title] of [
  ["/dealers", "Dealers"],
  ["/usuarios", "Usuarios"],
  ["/auditoria", "Bitácora de auditoría"],
] as const) {
  test(`${title}: "Volver al inicio" lleva a Inicio`, async ({ page }) => {
    await page.goto(path);
    await expect(heading(page)).toHaveText(title);
    await page.getByRole("main").getByRole("link", { name: "Volver al inicio", exact: true }).click();
    await expectHome(page, "Administrador");
  });
}

test('detalle del dealer: "Volver a Dealers" lleva a la lista', async ({ page }) => {
  await page.goto(`/dealers/${DEALER_LIMA.id}`);
  await expect(heading(page)).toHaveText("Detalle del dealer");
  await page.getByRole("link", { name: "Volver a Dealers", exact: true }).click();
  await expect(page).toHaveURL(/\/dealers$/);
  await expect(heading(page)).toHaveText("Dealers");
});

test('detalle del usuario: "Volver a Usuarios" lleva a la lista', async ({ page }) => {
  await page.goto(`/usuarios/${ACTIVE_USER.id}`);
  await expect(heading(page)).toHaveText("Detalle del usuario");
  await page.getByRole("link", { name: "Volver a Usuarios", exact: true }).click();
  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(heading(page)).toHaveText("Usuarios");
});

test("el enlace va antes del título, también en un detalle inexistente", async ({ page }) => {
  await page.goto("/dealers/99999999-9999-4999-8999-999999999999");
  await expect(heading(page)).toHaveText("Detalle del dealer");
  const back = page.getByRole("link", { name: "Volver a Dealers", exact: true });
  await expect(back).toBeVisible();
  const backFirst = await back.evaluate(
    (link, title) => Boolean(title && link.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING),
    await heading(page).elementHandle(),
  );
  expect(backFirst).toBe(true);
});
