import { detailValue, field, heading } from "./helpers";
import { ADMIN, apiError, expect, ok, test } from "./mock-api";

const SAVED = "Los cambios se guardaron correctamente.";
const EMAIL_HINT = "Para cambiar tu correo, ingresa tu contraseña actual.";

test.beforeEach(({ api }) => {
  api.user = { ...ADMIN, phone: "987654321" };
});

test.describe("Mi perfil (B7.5)", () => {
  test("vista con los datos y edición de nombres y celular, sin contraseña", async ({ page, api }) => {
    await page.goto("/perfil");
    await expect(heading(page)).toHaveText("Mi perfil");
    await expect(page).toHaveTitle("Mi perfil · BackOffice Consentimientos");
    await expect(detailValue(page, "Usuario")).toHaveText("admin");
    await expect(detailValue(page, "DNI")).toHaveText("00000000");
    await expect(detailValue(page, "Correo")).toHaveText("admin@backoffice.local");
    await expect(detailValue(page, "Celular")).toHaveText("987654321");
    await expect(detailValue(page, "Rol")).toHaveText("Administrador");
    await expect(detailValue(page, "Último acceso")).toHaveText("15/11/2026 10:35");

    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByLabel("Contraseña actual")).toHaveCount(0);
    await field(page, "Nombres").fill("Adm");
    await field(page, "Celular").fill("");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByRole("status").getByText(SAVED)).toBeVisible();
    await expect(detailValue(page, "Nombres")).toHaveText("Adm");
    await expect(detailValue(page, "Celular")).toHaveText("—");
    await expect(page.getByRole("button", { name: "Editar" })).toBeFocused();
    // La cabecera usa la respuesta (`Me`) sin otra consulta.
    await expect(page.getByRole("button", { name: /Adm General/ })).toBeVisible();
    expect(api.calls("profileUpdate")[0]?.body).toEqual({
      firstNames: "Adm",
      lastNames: "General",
      email: "admin@backoffice.local",
      phone: null,
    });
  });

  test("cambiar el correo pide la contraseña actual (obligatoria y correcta)", async ({ page, api }) => {
    api.respond(
      "profileUpdate",
      apiError(422, "CURRENT_PASSWORD_INVALID", "La contraseña actual no es correcta.", "currentPassword"),
      ok({ ...ADMIN, phone: "987654321", email: "nuevo@backoffice.local" }),
    );
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Editar" }).click();

    // Mismo correo con mayúsculas y espacios: no cambia (la API lo normaliza).
    await field(page, "Correo").fill("  ADMIN@backoffice.local ");
    await expect(page.getByText(EMAIL_HINT)).toHaveCount(0);

    await field(page, "Correo").fill("nuevo@backoffice.local");
    const password = page.getByLabel("Contraseña actual");
    await expect(password).toBeVisible();
    await expect(password).toHaveAccessibleDescription(EMAIL_HINT);

    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(password).toHaveAccessibleDescription(`${EMAIL_HINT} Campo obligatorio`);
    expect(api.calls("profileUpdate")).toHaveLength(0);

    await password.fill("Incorrecta#1");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(password).toHaveAccessibleDescription(`${EMAIL_HINT} La contraseña actual no es correcta.`);

    await password.fill("Clave#2026");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(detailValue(page, "Correo")).toHaveText("nuevo@backoffice.local");
    expect(api.calls("profileUpdate").map((call) => call.body)).toEqual([
      { firstNames: "Administrador", lastNames: "General", email: "nuevo@backoffice.local", phone: "987654321", currentPassword: "Incorrecta#1" },
      { firstNames: "Administrador", lastNames: "General", email: "nuevo@backoffice.local", phone: "987654321", currentPassword: "Clave#2026" },
    ]);
  });

  test("correo de otro usuario → 409 en el campo; validación en el cliente", async ({ page, api }) => {
    api.respond("profileUpdate", apiError(409, "DUPLICATE", "Ya existe un usuario con ese correo.", "email"));
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Editar" }).click();

    await field(page, "Nombres").fill("");
    await field(page, "Celular").fill("123");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(field(page, "Nombres")).toHaveAccessibleDescription("Campo obligatorio");
    await expect(field(page, "Celular")).toHaveAccessibleDescription("El celular debe tener 9 dígitos.");
    expect(api.calls("profileUpdate")).toHaveLength(0);

    await field(page, "Nombres").fill("Administrador");
    await field(page, "Celular").fill("987 654 321");
    await field(page, "Correo").fill("jperez@dominio.com");
    await page.getByLabel("Contraseña actual").fill("Clave#2026");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(field(page, "Correo")).toHaveAccessibleDescription("Ya existe un usuario con ese correo.");
  });

  test("Cancelar descarta lo escrito", async ({ page, api }) => {
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Editar" }).click();
    await field(page, "Apellidos").fill("Otro");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(detailValue(page, "Apellidos")).toHaveText("General");
    expect(api.calls("profileUpdate")).toHaveLength(0);
  });
});
