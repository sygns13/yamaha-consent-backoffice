import { heading, NETWORK_ERROR_TEXT, VALID_PASSWORD } from "./helpers";
import { apiError, expect, FORGOT_PASSWORD_DETAIL, ok, test } from "./mock-api";

const TOKEN = "token-e2e_123";
const INVALID_LINK_TEXT = "El enlace no es válido o ya venció.";

test.describe("Recuperar contraseña", () => {
  test("tras el 202 muestra el detail, oculta el formulario y deja el enlace al login", async ({ page, api }) => {
    await page.goto("/recuperar-contrasena");
    await expect(page).toHaveTitle("Recuperar contraseña · BackOffice Consentimientos");
    await expect(
      page.getByText("Ingresa tu usuario o tu correo y te enviaremos un enlace para crear una nueva contraseña."),
    ).toBeVisible();

    await page.getByLabel("Usuario o correo").fill(" admin@backoffice.local ");
    await page.getByRole("button", { name: "Enviar enlace" }).click();

    await expect(page.getByRole("status").filter({ hasText: FORGOT_PASSWORD_DETAIL })).toBeVisible();
    await expect(page.getByLabel("Usuario o correo")).toBeHidden();
    await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeHidden();
    expect(api.calls("forgotPassword")[0]?.body).toEqual({ identifier: "admin@backoffice.local" });

    await page.getByRole("link", { name: "Volver a iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("vacío → 'Campo obligatorio'; error de red → mensaje de conexión", async ({ page, api }) => {
    api.respond("forgotPassword", "network-error");
    await page.goto("/recuperar-contrasena");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByLabel("Usuario o correo")).toHaveAccessibleDescription("Campo obligatorio");
    expect(api.calls("forgotPassword")).toHaveLength(0);

    await page.getByLabel("Usuario o correo").fill("admin");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByRole("alert")).toHaveText(NETWORK_ERROR_TEXT);
    await expect(page.getByLabel("Usuario o correo")).toBeVisible();
  });
});

test.describe("Restablecer contraseña (B6.6)", () => {
  test("token válido: quita t de la URL, guarda y termina en el login con aviso", async ({ page, api }) => {
    await page.goto(`/restablecer-contrasena?t=${TOKEN}`);

    await expect(page).toHaveURL(/\/restablecer-contrasena$/);
    await expect(heading(page)).toHaveText("Crear nueva contraseña");
    await expect(page.getByLabel("Nueva contraseña")).toBeVisible();
    expect(api.calls("resetTokenStatus").map((call) => call.path)).toEqual([`/auth/password-reset/${TOKEN}`]);

    // El checklist sigue la política de la API; el ítem de usuario/DNI queda neutral (D2).
    const checklist = page.getByRole("listitem");
    await expect(checklist).toHaveCount(7);
    await page.getByLabel("Nueva contraseña").fill(VALID_PASSWORD);
    await expect(checklist.filter({ hasText: "(cumplido)" })).toHaveCount(6);
    await expect(checklist.filter({ hasText: "No debe contener tu usuario ni tu DNI" })).toHaveAttribute(
      "data-state",
      "unknown",
    );

    await page.getByLabel("Confirmar contraseña").fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await expect(page).toHaveURL(/\/login\?motivo=contrasena-actualizada$/);
    await expect(page.getByText("Tu contraseña fue actualizada. Ingresa con tu nueva contraseña.")).toBeVisible();
    expect(api.calls("passwordReset")[0]?.body).toEqual({ token: TOKEN, newPassword: VALID_PASSWORD });
  });

  for (const [name, response] of [
    ["EXPIRED", ok({ tokenStatus: "EXPIRED" })],
    ["USED", ok({ tokenStatus: "USED" })],
    ["INVALID", ok({ tokenStatus: "INVALID" })],
    ["404", apiError(404, "RESET_LINK_NOT_FOUND", "El enlace no existe.")],
  ] as const) {
    test(`token ${name} → mensaje y enlace para pedir otro`, async ({ page, api }) => {
      api.respond("resetTokenStatus", response);
      await page.goto(`/restablecer-contrasena?t=${TOKEN}`);

      await expect(page.getByText(INVALID_LINK_TEXT)).toBeVisible();
      await expect(page).toHaveURL(/\/restablecer-contrasena$/);
      await expect(page.getByLabel("Nueva contraseña")).toBeHidden();

      await page.getByRole("link", { name: "Solicitar un nuevo enlace" }).click();
      await expect(page).toHaveURL(/\/recuperar-contrasena$/);
    });
  }

  test("sin t → enlace no válido, sin llamar a la API", async ({ page, api }) => {
    await page.goto("/restablecer-contrasena");
    await expect(page.getByText(INVALID_LINK_TEXT)).toBeVisible();
    expect(api.calls("resetTokenStatus")).toHaveLength(0);
  });

  test("410 al guardar → enlace no válido", async ({ page, api }) => {
    api.respond(
      "passwordReset",
      apiError(410, "RESET_LINK_INVALID", "El enlace para restablecer la contraseña no es válido o ya venció. Solicita uno nuevo."),
    );
    await page.goto(`/restablecer-contrasena?t=${TOKEN}`);
    await page.getByLabel("Nueva contraseña").fill(VALID_PASSWORD);
    await page.getByLabel("Confirmar contraseña").fill(VALID_PASSWORD);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await expect(page.getByText(INVALID_LINK_TEXT)).toBeVisible();
    await expect(page.getByRole("link", { name: "Solicitar un nuevo enlace" })).toBeVisible();
  });

  test("422 PASSWORD_POLICY del servidor → en el campo", async ({ page, api }) => {
    const detail = "La contraseña no cumple los requisitos: no debe contener tu usuario ni tu DNI.";
    api.respond("passwordReset", apiError(422, "PASSWORD_POLICY", detail, "newPassword"));
    await page.goto(`/restablecer-contrasena?t=${TOKEN}`);
    await page.getByLabel("Nueva contraseña").fill("Admin#2026");
    await page.getByLabel("Confirmar contraseña").fill("Admin#2026");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await expect(page.getByLabel("Nueva contraseña")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(detail)).toBeVisible();
    await expect(page).toHaveURL(/\/restablecer-contrasena$/);
  });

  test("validación en el cliente: política y confirmación, sin llamar a la API", async ({ page, api }) => {
    await page.goto(`/restablecer-contrasena?t=${TOKEN}`);
    await page.getByLabel("Nueva contraseña").fill("clave");
    await page.getByLabel("Confirmar contraseña").fill("otra");
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await expect(
      page.getByText(
        "La contraseña no cumple los requisitos: al menos 8 caracteres, una letra mayúscula, un número, un carácter especial (por ejemplo ! @ # $ %).",
      ),
    ).toBeVisible();
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
    expect(api.calls("passwordReset")).toHaveLength(0);
  });

  test("error de red al validar el enlace → Reintentar", async ({ page, api }) => {
    api.respond("resetTokenStatus", "network-error", ok({ tokenStatus: "VALID" }));
    await page.goto(`/restablecer-contrasena?t=${TOKEN}`);

    await expect(page.getByRole("alert")).toHaveText(NETWORK_ERROR_TEXT);
    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByLabel("Nueva contraseña")).toBeVisible();
    // El reintento usa el token guardado en memoria aunque ya no esté en la URL.
    expect(api.calls("resetTokenStatus").map((call) => call.path)).toEqual([
      `/auth/password-reset/${TOKEN}`,
      `/auth/password-reset/${TOKEN}`,
    ]);
  });
});
