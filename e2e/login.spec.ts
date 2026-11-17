import { expectHome, fillLogin, heading, NETWORK_ERROR_TEXT, VALID_PASSWORD } from "./helpers";
import { ADMIN, apiError, expect, NEW_ADMIN, ok, test } from "./mock-api";

const LOCKED_DETAIL =
  "Tu usuario está bloqueado temporalmente por intentos fallidos. Inténtalo nuevamente en 15 minutos o comunícate con el Administrador.";
const INACTIVE_DETAIL = "Tu usuario está inactivo. Comunícate con el Administrador.";

test.describe("Login (B6.2)", () => {
  test("login correcto → Inicio", async ({ page, api }) => {
    api.respond("login", ok(ADMIN));
    await page.goto("/login");
    await expect(page).toHaveTitle("Iniciar sesión · BackOffice Consentimientos");
    await expect(heading(page)).toHaveText("Iniciar sesión");

    await fillLogin(page, "  admin ", VALID_PASSWORD);

    await expectHome(page, "Administrador");
    await expect(page).toHaveTitle("Inicio · BackOffice Consentimientos");
    const [call] = api.calls("login");
    expect(call?.body).toEqual({ username: "admin", password: VALID_PASSWORD });
    expect(call?.headers["x-requested-with"]).toBe("XMLHttpRequest");
  });

  test("401 → 'Usuario o contraseña incorrectos.'", async ({ page, api }) => {
    api.respond("login", apiError(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos."));
    await page.goto("/login");
    await fillLogin(page, "admin", "Incorrecta#1");

    await expect(page.getByRole("alert")).toHaveText("Usuario o contraseña incorrectos.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("423 → el detail de la API", async ({ page, api }) => {
    api.respond("login", apiError(423, "ACCOUNT_LOCKED", LOCKED_DETAIL));
    await page.goto("/login");
    await fillLogin(page, "admin", VALID_PASSWORD);

    await expect(page.getByRole("alert")).toHaveText(LOCKED_DETAIL);
  });

  test("403 de usuario inactivo → el detail de la API", async ({ page, api }) => {
    api.respond("login", apiError(403, "USER_INACTIVE", INACTIVE_DETAIL));
    await page.goto("/login");
    await fillLogin(page, "admin", VALID_PASSWORD);

    await expect(page.getByRole("alert")).toHaveText(INACTIVE_DETAIL);
  });

  test("error de red → mensaje de conexión y el reintento entra", async ({ page, api }) => {
    api.respond("login", "network-error", ok(ADMIN));
    await page.goto("/login");
    await fillLogin(page, "admin", VALID_PASSWORD);

    await expect(page.getByRole("alert")).toHaveText(NETWORK_ERROR_TEXT);
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeEnabled();

    await page.getByRole("button", { name: "Ingresar" }).click();

    await expectHome(page, "Administrador");
    expect(api.calls("login")).toHaveLength(2);
  });

  test("campos vacíos → 'Campo obligatorio' sin llamar a la API", async ({ page, api }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByLabel("Usuario", { exact: true })).toHaveAccessibleDescription("Campo obligatorio");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAccessibleDescription("Campo obligatorio");
    await expect(page.getByLabel("Usuario", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(api.calls("login")).toHaveLength(0);
  });

  test("mostrar y ocultar la contraseña", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByLabel("Contraseña", { exact: true });
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar contraseña" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("avisos de sesión vencida y de contraseña actualizada", async ({ page }) => {
    await page.goto("/login?motivo=sesion-expirada");
    await expect(page.getByText("Tu sesión expiró. Ingresa nuevamente.")).toBeVisible();

    await page.goto("/login?motivo=contrasena-actualizada");
    await expect(page.getByText("Tu contraseña fue actualizada. Ingresa con tu nueva contraseña.")).toBeVisible();
  });

  test("con sesión válida, /login redirige a Inicio (también con next)", async ({ page, api }) => {
    api.user = ADMIN;
    await page.goto("/login?next=%2Fusuarios");
    await expectHome(page, "Administrador");
  });

  test("enlace a recuperar contraseña", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL(/\/recuperar-contrasena$/);
    await expect(heading(page)).toHaveText("Recuperar contraseña");
  });
});

test.describe("Rutas protegidas y next (B6.4)", () => {
  test("sin sesión → /login?next=... y, tras ingresar, vuelve a esa ruta", async ({ page, api }) => {
    await page.goto("/usuarios?page=2");

    await expect(page).toHaveURL(/\/login\?next=%2Fusuarios%3Fpage%3D2$/);
    await expect(page.getByText("Tu sesión expiró")).toBeHidden();

    api.respond("login", ok(ADMIN));
    await fillLogin(page, "admin", VALID_PASSWORD);

    await expect(page).toHaveURL(/\/usuarios\?page=2$/);
    await expect(heading(page)).toHaveText("Usuarios");
  });

  for (const next of ["//malicioso.com", "/\\malicioso.com", "https://malicioso.com"]) {
    test(`next=${next} se ignora y lleva a Inicio`, async ({ page, api }) => {
      api.respond("login", ok(ADMIN));
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await fillLogin(page, "admin", VALID_PASSWORD);

      await expectHome(page, "Administrador");
      expect(page.url()).toBe(new URL("/", page.url()).href);
      expect(new URL(page.url()).host).toBe("localhost:4323");
    });
  }

  test("con contraseña temporal, el login lleva a /cambiar-contrasena aunque haya next (B6.3)", async ({ page, api }) => {
    api.respond("login", ok(NEW_ADMIN));
    await page.goto("/login?next=%2Fusuarios");
    await fillLogin(page, "admin", "Temporal#2026");

    await expect(page).toHaveURL(/\/cambiar-contrasena$/);
    await expect(heading(page)).toHaveText("Cambiar contraseña");
  });
});
