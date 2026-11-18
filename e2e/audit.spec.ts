import { ACTIVE_USER, AUDIT_ITEMS, DEALER_ID, DELETED_REF, page as pageOf } from "./fixtures";
import { field, heading, NETWORK_ERROR_TEXT } from "./helpers";
import { ADMIN, apiError, expect, ok, test } from "./mock-api";

/** "Hoy" en Lima: 17/11/2026. Los 7 días por defecto van del 11 al 17 (D5). */
const NOW = new Date("2026-11-17T12:00:00-05:00");
const DEFAULT_RANGE = "from=2026-11-11&to=2026-11-17";

test.beforeEach(async ({ page, api }) => {
  api.user = ADMIN;
  await page.clock.setFixedTime(NOW);
});

function rows(page: import("@playwright/test").Page) {
  return page.getByRole("table").getByRole("row");
}

test.describe("Bitácora (B7.4)", () => {
  test("por defecto, los últimos 7 días; acción en español, usuario, entidad con enlace e IP", async ({ page, api }) => {
    await page.goto("/auditoria");
    await expect(heading(page)).toHaveText("Bitácora de auditoría");
    await expect(page).toHaveURL(new RegExp(`/auditoria\\?${DEFAULT_RANGE}$`));
    await expect(field(page, "Desde")).toHaveValue("2026-11-11");
    await expect(field(page, "Hasta")).toHaveValue("2026-11-17");
    expect(api.calls("auditLogs").map((call) => call.query)).toEqual([{ from: "2026-11-11", to: "2026-11-17", page: "1", pageSize: "20" }]);

    const updated = rows(page).nth(1);
    await expect(updated.getByRole("cell").nth(0)).toHaveText("17/11/2026 09:30");
    await expect(updated.getByRole("cell").nth(1)).toHaveText("Administrador Generaladmin");
    await expect(updated.getByRole("cell").nth(2)).toHaveText("Usuario actualizado");
    await expect(updated.getByRole("link", { name: ACTIVE_USER.id })).toHaveAttribute("href", `/usuarios/${ACTIVE_USER.id}`);
    await expect(updated.getByRole("cell").nth(4)).toHaveText("190.12.34.56");
    await expect(rows(page).nth(2).getByRole("link", { name: DEALER_ID })).toHaveAttribute("href", `/dealers/${DEALER_ID}`);

    // Login fallido de un usuario inexistente: sin actor, sin id ni IP.
    const failed = rows(page).nth(3);
    await expect(failed.getByRole("cell").nth(1)).toHaveText("—");
    await expect(failed.getByRole("cell").nth(2)).toHaveText("Inicio de sesión fallido");
    await expect(failed.getByRole("cell").nth(3)).toHaveText("Usuario");
    await expect(failed.getByRole("cell").nth(4)).toHaveText("—");

    // El enlace de la entidad lleva a su detalle.
    await updated.getByRole("link", { name: ACTIVE_USER.id }).click();
    await expect(page).toHaveURL(new RegExp(`/usuarios/${ACTIVE_USER.id}$`));
    await expect(heading(page)).toHaveText("Detalle del usuario");
  });

  test("detalle expandible con el JSON formateado", async ({ page }) => {
    await page.goto("/auditoria");
    const toggle = rows(page).nth(1).getByRole("button", { name: "Ver detalle" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();

    const hide = rows(page).nth(1).getByRole("button", { name: "Ocultar detalle" });
    await expect(hide).toHaveAttribute("aria-expanded", "true");
    const detail = page.locator(`#${await hide.getAttribute("aria-controls")}`);
    await expect(detail).toHaveText(JSON.stringify(AUDIT_ITEMS[0]!.details, null, 2));
    await hide.click();
    await expect(detail).toHaveCount(0);
    // Sin detalles (logout): "—" y sin botón.
    await expect(rows(page).nth(4).getByRole("button")).toHaveCount(0);
  });

  test("filtros en la URL y en la consulta; Atrás restaura", async ({ page, api }) => {
    await page.goto("/auditoria");
    await expect(field(page, "Usuario")).toContainText("Juan Pérez Gómez (jperez)");

    await field(page, "Usuario").selectOption({ label: "Juan Pérez Gómez (jperez)" });
    await expect(page).toHaveURL(new RegExp(`actorUserId=${ACTIVE_USER.id}`));
    await field(page, "Acción").selectOption({ label: "Usuario actualizado" });
    await expect(page).toHaveURL(/action=USER_UPDATED/);
    await field(page, "Tipo de entidad").selectOption({ label: "Dealer" });
    await expect(page).toHaveURL(/entityType=DEALER/);
    await field(page, "Desde").fill("2026-11-01");
    await expect(page).toHaveURL(/from=2026-11-01/);

    expect(api.calls("auditLogs").at(-1)?.query).toEqual({
      from: "2026-11-01",
      to: "2026-11-17",
      actorUserId: ACTIVE_USER.id,
      action: "USER_UPDATED",
      entityType: "DEALER",
      page: "1",
      pageSize: "20",
    });

    await page.goBack();
    await expect(field(page, "Desde")).toHaveValue("2026-11-11");
    await page.goBack();
    await expect(field(page, "Tipo de entidad")).toHaveValue("");
    await page.goBack();
    await expect(field(page, "Acción")).toHaveValue("");
    await page.goBack();
    await expect(field(page, "Usuario")).toHaveValue("");
  });

  test("sin fecha: el campo vacío se conserva en la URL y no vuelven los 7 días", async ({ page, api }) => {
    await page.goto("/auditoria");
    await field(page, "Desde").fill("");
    await expect(page).toHaveURL(/\?from=&to=2026-11-17$/);
    await expect(field(page, "Desde")).toHaveValue("");
    expect(api.calls("auditLogs").at(-1)?.query).toEqual({ to: "2026-11-17", page: "1", pageSize: "20" });
  });

  test("Desde posterior a Hasta → mensaje del Anexo A.3 sin llamar a la API", async ({ page, api }) => {
    await page.goto(`/auditoria?${DEFAULT_RANGE}`);
    await expect(rows(page)).toHaveCount(5);
    const before = api.calls("auditLogs").length;
    await field(page, "Desde").fill("2026-11-20");
    await expect(field(page, "Hasta")).toHaveAccessibleDescription("La fecha final no puede ser anterior a la inicial.");
    await expect(page.getByRole("table")).toHaveCount(0);
    expect(api.calls("auditLogs")).toHaveLength(before);
  });

  test("un actor que ya no está en la lista de usuarios (eliminado) se muestra como opción", async ({ page, api }) => {
    api.respond("auditLogs", ok(pageOf([{ ...AUDIT_ITEMS[3]!, actor: DELETED_REF }])));
    await page.goto(`/auditoria?${DEFAULT_RANGE}&actorUserId=${DELETED_REF.id}`);
    await expect(field(page, "Usuario")).toHaveValue(DELETED_REF.id);
    await expect(field(page, "Usuario").locator("option:checked")).toHaveText("Ex Usuario (exusuario)");
  });

  test("paginación en la URL; sin resultados; error de red con Reintentar", async ({ page, api }) => {
    api.respond("auditLogs", ok(pageOf(AUDIT_ITEMS, 30)), "network-error", ok(pageOf([])));
    await page.goto("/auditoria");
    await expect(page.getByText("Mostrando 1–20 de 30")).toBeVisible();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(NETWORK_ERROR_TEXT)).toBeVisible();
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("No hay resultados para los filtros aplicados.")).toBeVisible();
  });

  test("rol con Bitácora sin Usuarios: no pide /users y el filtro usa los actores de los resultados (v1.5)", async ({ page, api }) => {
    api.user = { ...ADMIN, modules: [{ code: "AUDITORIA", name: "Bitácora de auditoría" }] };
    await page.goto("/auditoria");
    await expect(rows(page)).toHaveCount(5);
    await expect(field(page, "Usuario").locator("option")).toHaveText(["Todos", "Administrador General (admin)"]);
    await field(page, "Usuario").selectOption({ label: "Administrador General (admin)" });
    await expect(page).toHaveURL(new RegExp(`actorUserId=${AUDIT_ITEMS[0]!.actor!.id}`));
    expect(api.calls("users")).toHaveLength(0);
  });

  test("403 de /users (permiso quitado durante la sesión): sin error, el filtro usa los actores", async ({ page, api }) => {
    api.respond("users", apiError(403, "FORBIDDEN", "No tienes permiso para realizar esta acción."));
    await page.goto("/auditoria");
    await expect(rows(page)).toHaveCount(5);
    await expect(page.getByText(NETWORK_ERROR_TEXT)).toHaveCount(0);
    await expect(field(page, "Usuario").locator("option")).toHaveText(["Todos", "Administrador General (admin)"]);
  });
});
