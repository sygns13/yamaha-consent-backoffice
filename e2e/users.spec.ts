import type { Page } from "@playwright/test";
import {
  ACTIVE_USER,
  INACTIVE_USER,
  LOCKED_USER,
  page as pageOf,
  SELF_DETAIL,
  summary,
  TEMPORARY_PASSWORD,
  USERS,
} from "./fixtures";
import { detailValue, field, heading, NETWORK_ERROR_TEXT } from "./helpers";
import { ADMIN, apiError, CREATED_USER_ID, expect, ok, test } from "./mock-api";

const SAVED = "Los cambios se guardaron correctamente.";
const SEARCH_LABEL = "Buscar por DNI, nombre, usuario o correo";

test.beforeEach(({ api }) => {
  api.user = ADMIN;
});

async function fillNewUser(page: Page) {
  await field(page, "DNI").fill("45678901");
  await field(page, "Nombres").fill("Ana");
  await field(page, "Apellidos").fill("Torres Díaz");
  await field(page, "Usuario").fill("atorres");
  await field(page, "Correo").fill("atorres@dominio.com");
  await field(page, "Celular").fill("+51 987 654 321");
  await field(page, "Rol").selectOption("OPERADOR");
}

function toast(page: Page, text: string) {
  return page.getByRole("status").getByText(text);
}

test.describe("Alta de usuario (B7.1)", () => {
  test("muestra la contraseña temporal una sola vez, 'Copiar' funciona y lleva al detalle", async ({ page, api }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    api.respond("user", ok({ ...ACTIVE_USER, id: CREATED_USER_ID, username: "atorres", mustChangePassword: true }));
    await page.goto("/usuarios/nuevo");
    await expect(heading(page)).toHaveText("Nuevo usuario");
    await expect(page).toHaveTitle("Nuevo usuario · BackOffice Consentimientos");
    await expect(page.getByText("* Campo obligatorio")).toBeVisible();

    await fillNewUser(page);
    await page.getByRole("button", { name: "Guardar" }).click();

    const dialog = page.getByRole("dialog", { name: "Contraseña temporal" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Usuario: atorres");
    await expect(dialog).toContainText(TEMPORARY_PASSWORD);
    await expect(dialog).toContainText(
      "Esta contraseña se muestra una sola vez. Entrégala al usuario por un canal seguro; deberá cambiarla al iniciar sesión.",
    );
    expect(api.calls("userCreate")[0]?.body).toEqual({
      dni: "45678901",
      firstNames: "Ana",
      lastNames: "Torres Díaz",
      username: "atorres",
      email: "atorres@dominio.com",
      phone: "+51 987 654 321",
      roleCode: "OPERADOR",
    });

    await dialog.getByRole("button", { name: "Copiar" }).click();
    await expect(dialog.getByRole("button", { name: "Copiada" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TEMPORARY_PASSWORD);

    // Solo se cierra con "Entendido".
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Entendido" }).click();
    await expect(page).toHaveURL(new RegExp(`/usuarios/${CREATED_USER_ID}$`));
    await expect(heading(page)).toHaveText("Detalle del usuario");
    await expect(page.getByText(TEMPORARY_PASSWORD)).toHaveCount(0);
  });

  test("409 DUPLICATE y 422 de la API se muestran en su campo", async ({ page, api }) => {
    api.respond(
      "userCreate",
      apiError(409, "DUPLICATE", "Ya existe un usuario con ese DNI.", "dni"),
      apiError(409, "DUPLICATE", "Ya existe un usuario con ese nombre de usuario.", "username"),
      apiError(409, "DUPLICATE", "Ya existe un usuario con ese correo.", "email"),
      { status: 422, body: { detail: [{ type: "value_error", loc: ["body", "phone"], msg: "El celular debe tener 9 dígitos." }] } },
    );
    await page.goto("/usuarios/nuevo");
    await fillNewUser(page);
    const save = page.getByRole("button", { name: "Guardar" });

    const cases = [
      ["DNI", "Ya existe un usuario con ese DNI."],
      ["Usuario", "Ya existe un usuario con ese nombre de usuario."],
      ["Correo", "Ya existe un usuario con ese correo."],
      ["Celular", "El celular debe tener 9 dígitos."],
    ] as const;
    for (const [label, message] of cases) {
      await save.click();
      const input = field(page, label);
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await expect(input).toHaveAccessibleDescription(new RegExp(message.replace(".", "\\.")));
      await expect(input).toBeFocused();
    }
    expect(api.calls("userCreate")).toHaveLength(4);
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("validación en el cliente con los mensajes de la API, sin llamarla", async ({ page, api }) => {
    await page.goto("/usuarios/nuevo");
    await page.getByRole("button", { name: "Guardar" }).click();
    for (const label of ["DNI", "Nombres", "Apellidos", "Usuario", "Correo", "Rol"]) {
      await expect(field(page, label)).toHaveAccessibleDescription(/Campo obligatorio/);
    }
    await expect(field(page, "Celular")).not.toHaveAttribute("aria-invalid");

    await field(page, "DNI").fill("1234567");
    await field(page, "Nombres").fill("Juan2");
    await field(page, "Apellidos").fill("Pérez");
    await field(page, "Usuario").fill("1abc");
    await field(page, "Correo").fill("correo@dominio");
    await field(page, "Celular").fill("98765");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("El DNI debe tener 8 dígitos.")).toBeVisible();
    await expect(page.getByText("El nombre solo puede contener letras, espacios, apóstrofo, punto y guion.")).toBeVisible();
    await expect(
      page.getByText(
        "El usuario debe tener de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo, y empezar con una letra.",
      ),
    ).toBeVisible();
    await expect(page.getByText("El correo no tiene un formato válido.")).toBeVisible();
    await expect(page.getByText("El celular debe tener 9 dígitos.")).toBeVisible();
    expect(api.calls("userCreate")).toHaveLength(0);
  });
});

test.describe("Edición (B7.2 y B7.3)", () => {
  test("otro usuario: usuario deshabilitado, rol editable; PUT con la versión y vuelta al detalle", async ({ page, api }) => {
    await page.goto(`/usuarios/${ACTIVE_USER.id}/editar`);
    await expect(heading(page)).toHaveText("Editar usuario");
    await expect(field(page, "Usuario")).toBeDisabled();
    await expect(field(page, "Usuario")).toHaveValue("jperez");
    await expect(field(page, "Rol")).toBeEnabled();
    await expect(field(page, "Rol")).toHaveValue("OPERADOR");

    await field(page, "Celular").fill("");
    await field(page, "Rol").selectOption("ADMIN");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(new RegExp(`/usuarios/${ACTIVE_USER.id}$`));
    await expect(toast(page, SAVED)).toBeVisible();
    expect(api.calls("userUpdate")[0]?.body).toEqual({
      dni: ACTIVE_USER.dni,
      firstNames: ACTIVE_USER.firstNames,
      lastNames: ACTIVE_USER.lastNames,
      email: ACTIVE_USER.email,
      phone: null,
      roleCode: "ADMIN",
      version: ACTIVE_USER.version,
    });
  });

  test("el propio usuario: rol deshabilitado y se envía el que tiene", async ({ page, api }) => {
    await page.goto(`/usuarios/${SELF_DETAIL.id}/editar`);
    await expect(field(page, "Rol")).toBeDisabled();
    await field(page, "Nombres").fill("Admin");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(toast(page, SAVED)).toBeVisible();
    expect(api.calls("userUpdate")[0]?.body).toMatchObject({ firstNames: "Admin", roleCode: "ADMIN", version: 1 });
  });

  test("VERSION_CONFLICT → aviso con 'Recargar', que trae el registro vigente (B7.3)", async ({ page, api }) => {
    const newer = { ...ACTIVE_USER, firstNames: "Juan Carlos", version: 3 };
    api.respond("user", ok(ACTIVE_USER), ok(newer));
    api.respond(
      "userUpdate",
      apiError(409, "VERSION_CONFLICT", "El registro fue modificado por otro usuario. Recarga la página e inténtalo de nuevo."),
      ok({ ...newer, version: 4 }),
    );
    await page.goto(`/usuarios/${ACTIVE_USER.id}/editar`);
    await field(page, "Apellidos").fill("Pérez");
    await page.getByRole("button", { name: "Guardar" }).click();

    const notice = page.getByRole("alert").filter({ hasText: "El registro fue modificado por otro usuario." });
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: "Recargar" }).click();
    await expect(field(page, "Nombres")).toHaveValue("Juan Carlos");
    await expect(field(page, "Apellidos")).toHaveValue(ACTIVE_USER.lastNames);
    await expect(page.getByText("El registro fue modificado por otro usuario.")).toHaveCount(0);

    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(toast(page, SAVED)).toBeVisible();
    expect(api.calls("userUpdate").map((call) => (call.body as { version: number }).version)).toEqual([2, 3]);
  });
});

test.describe("Acciones (B7.2)", () => {
  test("fila propia sin Desactivar, Eliminar ni Generar contraseña temporal; acciones según el estado", async ({ page }) => {
    await page.goto("/usuarios");
    await expect(heading(page)).toHaveText("Usuarios");
    const row = (username: string) => page.getByRole("row").filter({ has: page.getByRole("cell", { name: username, exact: true }) });

    const self = row("admin");
    await expect(self.getByRole("link", { name: "Ver admin" })).toBeVisible();
    await expect(self.getByRole("link", { name: "Editar admin" })).toBeVisible();
    await expect(self.getByRole("button")).toHaveCount(0);

    await expect(row("jperez").getByRole("button")).toHaveText(["Desactivar jperez", "Generar contraseña temporal jperez", "Eliminar jperez"]);
    await expect(row("mlopez").getByRole("button")).toHaveText(["Activar mlopez", "Generar contraseña temporal mlopez", "Eliminar mlopez"]);
    await expect(row("cruiz").getByRole("button")).toHaveText([
      "Desactivar cruiz",
      "Desbloquear cruiz",
      "Generar contraseña temporal cruiz",
      "Eliminar cruiz",
    ]);
    await expect(row("jperez").getByText("Activo", { exact: true })).toBeVisible();
    await expect(row("mlopez").getByText("Inactivo", { exact: true })).toBeVisible();
    await expect(row("cruiz").getByText("Bloqueado", { exact: true })).toBeVisible();
  });

  test("desactivar con ConfirmDialog: Cancelar no llama y devuelve el foco; confirmar llama y avisa", async ({ page, api }) => {
    await page.goto("/usuarios");
    const trigger = page.getByRole("button", { name: "Desactivar jperez" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Desactivar" });
    await expect(dialog).toHaveAccessibleDescription(
      "¿Desactivar a jperez? No podrá iniciar sesión y se cerrarán sus sesiones activas.",
    );
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(api.calls("userDeactivate")).toHaveLength(0);

    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await trigger.click();
    await dialog.getByRole("button", { name: "Desactivar" }).click();
    await expect(dialog).toBeHidden();
    await expect(toast(page, SAVED)).toBeVisible();
    expect(api.calls("userDeactivate").map((call) => call.path)).toEqual([`/users/${ACTIVE_USER.id}/deactivate`]);
  });

  test("activar y desbloquear van sin confirmación (D4)", async ({ page, api }) => {
    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Activar mlopez" }).click();
    await expect(toast(page, SAVED)).toBeVisible();
    await page.getByRole("button", { name: "Desbloquear cruiz" }).click();
    await expect.poll(() => api.calls("userUnlock").length).toBe(1);
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(api.calls("userActivate")[0]?.path).toBe(`/users/${INACTIVE_USER.id}/activate`);
    expect(api.calls("userUnlock")[0]?.path).toBe(`/users/${LOCKED_USER.id}/unlock`);
  });

  test("generar contraseña temporal: confirmación y el mismo modal", async ({ page, api }) => {
    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Generar contraseña temporal jperez" }).click();
    const confirm = page.getByRole("dialog", { name: "Generar contraseña temporal" });
    await expect(confirm).toHaveAccessibleDescription(
      "Se generará una nueva contraseña temporal para jperez y se cerrarán sus sesiones activas. ¿Continuar?",
    );
    await confirm.getByRole("button", { name: "Generar contraseña temporal" }).click();

    const modal = page.getByRole("dialog", { name: "Contraseña temporal" });
    await expect(modal).toContainText("Usuario: jperez");
    await expect(modal).toContainText(TEMPORARY_PASSWORD);
    await modal.getByRole("button", { name: "Entendido" }).click();
    await expect(modal).toBeHidden();
    await expect(page.getByText(TEMPORARY_PASSWORD)).toHaveCount(0);
    expect(api.calls("userResetPassword")).toHaveLength(1);
  });

  test("eliminar con confirmación → 'Usuario eliminado.' y recarga de la lista", async ({ page, api }) => {
    api.respond("users", ok(pageOf(USERS.map(summary))), ok(pageOf(USERS.filter((u) => u.id !== ACTIVE_USER.id).map(summary))));
    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Eliminar jperez" }).click();
    const dialog = page.getByRole("dialog", { name: "Eliminar" });
    await expect(dialog).toHaveAccessibleDescription("¿Eliminar a jperez? Dejará de mostrarse y se cerrarán sus sesiones activas.");
    await dialog.getByRole("button", { name: "Eliminar" }).click();
    await expect(toast(page, "Usuario eliminado.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "jperez", exact: true })).toHaveCount(0);
    expect(api.calls("userDelete").map((call) => call.path)).toEqual([`/users/${ACTIVE_USER.id}`]);
  });

  test("un error de la acción (LAST_ADMIN) se avisa con el detail de la API", async ({ page, api }) => {
    api.respond("userDeactivate", apiError(409, "LAST_ADMIN", "Debe quedar al menos un Administrador activo."));
    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Desactivar cruiz" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(page.getByRole("status").getByText("Debe quedar al menos un Administrador activo.")).toBeVisible();
  });
});

test.describe("Lista: filtros, orden y página en la URL (B7.4)", () => {
  test("búsqueda con debounce, Rol, Estado, orden y página; Atrás restaura", async ({ page, api }) => {
    api.respond("users", ok(pageOf(USERS.map(summary), 45)));
    await page.goto("/usuarios");
    await expect(page.getByText("Mostrando 1–20 de 45")).toBeVisible();

    await page.getByLabel(SEARCH_LABEL).pressSequentially("perez");
    await expect(page).toHaveURL(/\?q=perez$/);
    // Debounce: una sola consulta con el texto completo, ninguna con un fragmento.
    expect(api.calls("users").map((call) => call.query.q).filter(Boolean)).toEqual(["perez"]);

    await field(page, "Rol").selectOption("OPERADOR");
    await expect(page).toHaveURL(/roleCode=OPERADOR/);
    await field(page, "Estado").selectOption("BLOQUEADO");
    await expect(page).toHaveURL(/status=BLOQUEADO/);

    const userHeader = page.getByRole("columnheader", { name: "Usuario" });
    await userHeader.getByRole("button").click();
    await expect(page).toHaveURL(/sortBy=username&sortOrder=asc/);
    await userHeader.getByRole("button").click();
    await expect(page).toHaveURL(/sortBy=username&sortOrder=desc/);
    await expect(userHeader).toHaveAttribute("aria-sort", "descending");

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Página 2 de 3")).toBeVisible();
    await field(page, "Filas por página").selectOption("50");
    await expect(page).toHaveURL(/pageSize=50/);
    await expect(page).not.toHaveURL(/page=2/);

    expect(api.calls("users").at(-1)?.query).toEqual({
      q: "perez",
      roleCode: "OPERADOR",
      status: "BLOQUEADO",
      sortBy: "username",
      sortOrder: "desc",
      page: "1",
      pageSize: "50",
    });

    // Atrás: página 2, luego sin página, ..., sin Estado, sin Rol, sin búsqueda.
    await page.goBack();
    await expect(page).toHaveURL(/page=2/);
    await expect(field(page, "Filas por página")).toHaveValue("20");
    await page.goBack();
    await page.goBack();
    await page.goBack();
    await expect(page).not.toHaveURL(/sortBy/);
    await expect(field(page, "Estado")).toHaveValue("BLOQUEADO");
    await page.goBack();
    await expect(field(page, "Estado")).toHaveValue("");
    await page.goBack();
    await expect(field(page, "Rol")).toHaveValue("");
    await page.goBack();
    await expect(page.getByLabel(SEARCH_LABEL)).toHaveValue("");
  });

  test("un enlace con filtros los aplica y los muestra", async ({ page, api }) => {
    await page.goto("/usuarios?q=lopez&roleCode=ADMIN&status=INACTIVO&sortBy=lastLoginAt&sortOrder=desc&pageSize=10");
    await expect(page.getByLabel(SEARCH_LABEL)).toHaveValue("lopez");
    await expect(field(page, "Rol")).toHaveValue("ADMIN");
    await expect(field(page, "Estado")).toHaveValue("INACTIVO");
    await expect(page.getByRole("columnheader", { name: "Último acceso" })).toHaveAttribute("aria-sort", "descending");
    expect(api.calls("users")[0]?.query).toEqual({
      q: "lopez",
      roleCode: "ADMIN",
      status: "INACTIVO",
      sortBy: "lastLoginAt",
      sortOrder: "desc",
      page: "1",
      pageSize: "10",
    });
  });

  test("sin resultados y error de red con Reintentar", async ({ page, api }) => {
    api.respond("users", "network-error", ok(pageOf([])));
    await page.goto("/usuarios");
    await expect(page.getByText(NETWORK_ERROR_TEXT)).toBeVisible();
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("No hay resultados para los filtros aplicados.")).toBeVisible();
  });
});

test.describe("Detalle", () => {
  test("datos, estado, bloqueo, autoría y acciones; desbloquear actualiza el estado", async ({ page, api }) => {
    await page.goto(`/usuarios/${LOCKED_USER.id}`);
    await expect(heading(page)).toHaveText("Detalle del usuario");
    await expect(page).toHaveTitle("Detalle del usuario · BackOffice Consentimientos");
    const value = (label: string) => detailValue(page, label);
    await expect(value("Usuario")).toHaveText("cruiz");
    await expect(value("Estado")).toHaveText("Bloqueado");
    await expect(value("Bloqueado hasta")).toHaveText("17/11/2026 10:15");
    await expect(value("Debe cambiar contraseña")).toHaveText("No");
    await expect(value("Creado por")).toHaveText("Administrador General (admin)");
    await expect(page.getByRole("link", { name: "Ver cruiz" })).toHaveCount(0);

    await page.getByRole("button", { name: "Desbloquear cruiz" }).click();
    await expect(value("Estado")).toHaveText("Activo");
    expect(api.calls("userUnlock")).toHaveLength(1);
  });

  test("eliminar desde el detalle vuelve a la lista", async ({ page }) => {
    await page.goto(`/usuarios/${ACTIVE_USER.id}`);
    await page.getByRole("button", { name: "Eliminar jperez" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(toast(page, "Usuario eliminado.")).toBeVisible();
  });

  test("inexistente → el detail de la API", async ({ page }) => {
    await page.goto("/usuarios/99999999-9999-4999-8999-999999999999");
    await expect(page.getByText("No existe el usuario.")).toBeVisible();
  });
});
