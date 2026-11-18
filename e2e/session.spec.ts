import {
  expectHome,
  fillLogin,
  heading,
  mainMenu,
  NETWORK_ERROR_TEXT,
  openMainMenu,
  openUserMenu,
  VALID_PASSWORD,
} from "./helpers";
import { ADMIN, apiError, expect, NEW_ADMIN, noContent, ok, OPERATOR, test } from "./mock-api";

const TEMPORARY_PASSWORD = "Temporal#2026Xy";
const MANDATORY_NOTICE = "Por seguridad, debes cambiar tu contraseña temporal antes de continuar.";

async function fillChangePassword(page: import("@playwright/test").Page, current: string, next: string) {
  await page.getByLabel("Contraseña actual").fill(current);
  await page.getByLabel("Nueva contraseña").fill(next);
  await page.getByLabel("Confirmar contraseña").fill(next);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
}

test.describe("Cambio obligatorio de contraseña (B6.3)", () => {
  test("solo /cambiar-contrasena, sin menú; tras cambiarla → Inicio con aviso y menú", async ({ page, api }) => {
    api.user = NEW_ADMIN;
    await page.goto("/");

    await expect(page).toHaveURL(/\/cambiar-contrasena$/);
    await expect(heading(page)).toHaveText("Cambiar contraseña");
    await expect(page.getByText(MANDATORY_NOTICE)).toBeVisible();
    await expect(mainMenu(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Menú", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Mi perfil" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

    // Cualquier otra ruta vuelve al cambio obligatorio.
    await page.goto("/usuarios");
    await expect(page).toHaveURL(/\/cambiar-contrasena$/);

    // El checklist conoce al usuario: con "admin" ese ítem queda pendiente.
    await page.getByLabel("Nueva contraseña").fill("Admin#2026");
    await expect(page.getByRole("listitem").filter({ hasText: "No debe contener tu usuario ni tu DNI" })).toHaveAttribute(
      "data-state",
      "unmet",
    );

    await fillChangePassword(page, TEMPORARY_PASSWORD, VALID_PASSWORD);

    await expectHome(page, "Administrador");
    await expect(page.getByText("Tu contraseña fue actualizada.")).toBeVisible();
    await openMainMenu(page);
    await expect(mainMenu(page).getByRole("link", { name: "Inicio" })).toBeVisible();
    expect(api.calls("changePassword")[0]?.body).toEqual({
      currentPassword: TEMPORARY_PASSWORD,
      newPassword: VALID_PASSWORD,
    });
  });

  test("errores del servidor en su campo: contraseña actual y política", async ({ page, api }) => {
    api.user = NEW_ADMIN;
    const policyDetail = "La contraseña no cumple los requisitos: distinta de la contraseña actual.";
    api.respond(
      "changePassword",
      apiError(422, "CURRENT_PASSWORD_INVALID", "La contraseña actual no es correcta.", "currentPassword"),
      apiError(422, "PASSWORD_POLICY", policyDetail, "newPassword"),
    );
    await page.goto("/cambiar-contrasena");

    await fillChangePassword(page, "Incorrecta#1", VALID_PASSWORD);
    await expect(page.getByLabel("Contraseña actual")).toHaveAccessibleDescription("La contraseña actual no es correcta.");

    await fillChangePassword(page, TEMPORARY_PASSWORD, VALID_PASSWORD);
    await expect(page.getByLabel("Nueva contraseña")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(policyDetail)).toBeVisible();
    await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  });

  test("validación en el cliente: igual a la actual y no coinciden", async ({ page, api }) => {
    api.user = NEW_ADMIN;
    await page.goto("/cambiar-contrasena");
    await page.getByLabel("Contraseña actual").fill(VALID_PASSWORD);
    await page.getByLabel("Nueva contraseña").fill(VALID_PASSWORD);
    await page.getByLabel("Confirmar contraseña").fill("Otra#2026");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();

    await expect(
      page.getByText("La contraseña no cumple los requisitos: distinta de la contraseña actual."),
    ).toBeVisible();
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
    expect(api.calls("changePassword")).toHaveLength(0);
  });
});

test.describe("Sesión vencida (B6.5)", () => {
  test("401 en una petición con sesión → /login?motivo=sesion-expirada&next=... y al reingresar vuelve", async ({
    page,
    api,
  }) => {
    api.user = ADMIN;
    await page.goto("/");
    await openUserMenu(page, "Administrador General");
    await page.getByRole("link", { name: "Cambiar contraseña" }).click();
    await expect(heading(page)).toHaveText("Cambiar contraseña");
    await expect(page.getByText(MANDATORY_NOTICE)).toBeHidden();

    api.user = null;
    api.respond("changePassword", apiError(401, "SESSION_EXPIRED", "Tu sesión expiró. Inicia sesión nuevamente."));
    await fillChangePassword(page, VALID_PASSWORD, "Nueva#2026x");

    await expect(page).toHaveURL(/\/login\?motivo=sesion-expirada&next=%2Fcambiar-contrasena$/);
    await expect(page.getByText("Tu sesión expiró. Ingresa nuevamente.")).toBeVisible();

    api.respond("login", ok(ADMIN));
    await fillLogin(page, "admin", VALID_PASSWORD);
    await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  });

  test("al recargar con la cookie vencida (401 SESSION_EXPIRED de /auth/me) → aviso de sesión vencida", async ({
    page,
    api,
  }) => {
    api.user = ADMIN;
    await page.goto("/dealers");
    await expect(heading(page)).toHaveText("Dealers");

    api.respond("me", apiError(401, "SESSION_EXPIRED", "Tu sesión expiró. Inicia sesión nuevamente."));
    await page.reload();

    await expect(page).toHaveURL(/\/login\?motivo=sesion-expirada&next=%2Fdealers$/);
    await expect(page.getByText("Tu sesión expiró. Ingresa nuevamente.")).toBeVisible();
  });

  test("error de red al consultar la sesión → Reintentar", async ({ page, api }) => {
    api.respond("me", "network-error", ok(ADMIN));
    await page.goto("/");

    await expect(page.getByRole("alert")).toHaveText(NETWORK_ERROR_TEXT);
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expectHome(page, "Administrador");
  });
});

test.describe("Permisos por rol (B6.7)", () => {
  test("Operador: el menú y las tarjetas solo tienen Dealers; /usuarios y /auditoria → /sin-permiso", async ({
    page,
    api,
  }) => {
    api.user = OPERATOR;
    await page.goto("/");
    await expectHome(page, "Olga");

    await openMainMenu(page);
    await expect(mainMenu(page).getByRole("link")).toHaveText(["Inicio", "Dealers"]);
    const cards = page.getByRole("main").getByRole("link");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(["Gestión de Dealers"]);
    await expect(cards).toContainText(["Registra y actualiza los datos de los Dealers."]);

    for (const path of ["/usuarios", "/usuarios/nuevo", "/auditoria"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sin-permiso$/);
      await expect(heading(page)).toHaveText("No tienes permiso para ver esta página.");
      await expect(page).toHaveTitle("Sin permiso · BackOffice Consentimientos");
    }

    await page.getByRole("link", { name: "Ir al inicio" }).click();
    await expectHome(page, "Olga");
  });

  test("Administrador: menú con los tres módulos y tarjetas con su descripción", async ({ page, api }) => {
    api.user = ADMIN;
    await page.goto("/");

    await openMainMenu(page);
    await expect(mainMenu(page).getByRole("link")).toHaveText(["Inicio", "Dealers", "Usuarios", "Bitácora"]);
    const cards = page.getByRole("main").getByRole("link");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText("Registra y actualiza los datos de los Dealers.");
    await expect(cards.nth(1)).toContainText("Crea y administra los usuarios del BackOffice.");
    await expect(cards.nth(2)).toContainText("Consulta las acciones registradas en el sistema.");

    await cards.filter({ hasText: "Bitácora de auditoría" }).click();
    // B7 (decisión D5): la bitácora agrega a la URL los 7 días por defecto.
    await expect(page).toHaveURL(/\/auditoria\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    await expect(heading(page)).toHaveText("Bitácora de auditoría");
  });
});

test.describe("Cabecera y menú de usuario", () => {
  test("distintivo de entorno, nombre y rol; Cerrar sesión → /login", async ({ page, api }) => {
    api.user = ADMIN;
    await page.goto("/");
    await expect(page.getByRole("banner").getByText("PRUEBAS", { exact: true })).toBeVisible();
    await expect(page.getByRole("banner").getByText("BackOffice · Consentimientos")).toBeVisible();

    await openUserMenu(page, "Administrador General");
    await expect(page.getByRole("link", { name: "Mi perfil" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(heading(page)).toHaveText("Iniciar sesión");
    expect(api.calls("logout")).toHaveLength(1);

    // Sin sesión, una ruta protegida vuelve al login.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("Escape cierra el menú de usuario", async ({ page, api }) => {
    api.user = ADMIN;
    await page.goto("/");
    await openUserMenu(page, "Administrador General");
    await expect(page.getByRole("link", { name: "Mi perfil" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Mi perfil" })).toBeHidden();
    await expect(page.getByRole("button", { name: /Administrador General/ })).toBeFocused();
  });

  test("si Cerrar sesión falla por red, se avisa y la sesión sigue", async ({ page, api }) => {
    api.user = ADMIN;
    api.respond("logout", "network-error", noContent);
    await page.goto("/");
    await openUserMenu(page, "Administrador General");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(page.getByRole("status").filter({ hasText: NETWORK_ERROR_TEXT })).toBeVisible();
    await expectHome(page, "Administrador");
  });

  test("menú lateral: panel desplegable bajo 1024 px, fijo en escritorio", async ({ page, api }) => {
    api.user = ADMIN;
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menú", exact: true });

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(toggle).toBeHidden();
    await expect(mainMenu(page)).toBeVisible();

    await page.setViewportSize({ width: 768, height: 800 });
    await expect(mainMenu(page)).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(mainMenu(page)).toBeVisible();
    await mainMenu(page).getByRole("link", { name: "Dealers" }).click();
    await expect(heading(page)).toHaveText("Dealers");
    await expect(mainMenu(page)).toBeHidden();
  });
});

test("el build corre con la CSP de la sección 8.8 (sin scripts ni estilos en línea) y noindex", async ({ page }) => {
  const response = await page.goto("/login");
  const csp = response?.headers()["content-security-policy"] ?? "";

  expect(csp).toContain("script-src 'self';");
  expect(csp).toContain("style-src 'self';");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  // El fixture falla el test si la CSP bloqueó algo.
});

test("ruta inexistente → 404 con 'Ir al inicio' (sin sesión, Inicio lleva al login)", async ({ page }) => {
  await page.goto("/no-existe");

  await expect(heading(page)).toHaveText("La página que buscas no existe.");
  await expect(page).toHaveTitle("Página no encontrada · BackOffice Consentimientos");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByRole("link", { name: "Ir al inicio" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("B6.8: login, cambio de contraseña, cierre, recuperación y restablecimiento envían X-Requested-With", async ({
  page,
  api,
}) => {
  api.respond("login", ok(NEW_ADMIN));
  await page.goto("/login");
  await fillLogin(page, "admin", TEMPORARY_PASSWORD);
  await fillChangePassword(page, TEMPORARY_PASSWORD, VALID_PASSWORD);
  await expectHome(page, "Administrador");
  await openUserMenu(page, "Administrador General");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/recuperar-contrasena");
  await page.getByLabel("Usuario o correo").fill("admin");
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByRole("link", { name: "Volver a iniciar sesión" })).toBeVisible();
  await expect(page.getByLabel("Usuario o correo")).toBeHidden();

  await page.goto("/restablecer-contrasena?t=abc");
  await page.getByLabel("Nueva contraseña").fill("Otra#2026x");
  await page.getByLabel("Confirmar contraseña").fill("Otra#2026x");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/login\?motivo=contrasena-actualizada$/);

  const mutations = api.requests.filter((request) => request.method !== "GET");
  expect(mutations.map((request) => `${request.method} ${request.path}`)).toEqual([
    "POST /auth/login",
    "POST /auth/change-password",
    "POST /auth/logout",
    "POST /auth/forgot-password",
    "POST /auth/password-reset",
  ]);
  for (const request of mutations) expect(request.headers["x-requested-with"]).toBe("XMLHttpRequest");
  // Los GET no la llevan (no hace falta: no cambian estado).
  expect(api.requests.filter((r) => r.method === "GET").every((r) => r.headers["x-requested-with"] === undefined)).toBe(
    true,
  );
});
