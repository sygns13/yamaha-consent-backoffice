import { describe, expect, it } from "vitest";
import type { PasswordPolicy } from "../../lib/api";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from "./schemas";

const POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

/** `{campo: mensaje}` de los issues de zod. */
function errors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));
}

describe("loginSchema", () => {
  it("obligatorios con el texto del traductor de la API", () => {
    expect(errors(loginSchema.safeParse({ username: "  ", password: "" }))).toEqual({
      username: "Campo obligatorio",
      password: "Campo obligatorio",
    });
  });

  it("máximos del LoginRequest (30 y 20)", () => {
    expect(errors(loginSchema.safeParse({ username: "a".repeat(31), password: "b".repeat(21) }))).toEqual({
      username: "Debe tener como máximo 30 caracteres",
      password: "Debe tener como máximo 20 caracteres",
    });
  });

  it("recorta el usuario; la contraseña va tal cual", () => {
    expect(loginSchema.parse({ username: " jperez ", password: " Clave#2026 " })).toEqual({
      username: "jperez",
      password: " Clave#2026 ",
    });
  });
});

describe("forgotPasswordSchema", () => {
  it("obligatorio y recortado", () => {
    expect(errors(forgotPasswordSchema.safeParse({ identifier: " " }))).toEqual({ identifier: "Campo obligatorio" });
    expect(forgotPasswordSchema.parse({ identifier: " jperez@dominio.com " })).toEqual({
      identifier: "jperez@dominio.com",
    });
  });
});

describe("resetPasswordSchema", () => {
  const schema = resetPasswordSchema(POLICY);

  it("válida y confirmada", () => {
    expect(schema.safeParse({ newPassword: "Clave#2026", confirmPassword: "Clave#2026" }).success).toBe(true);
  });

  it("vacías → Campo obligatorio", () => {
    expect(errors(schema.safeParse({ newPassword: "", confirmPassword: "" }))).toEqual({
      newPassword: "Campo obligatorio",
      confirmPassword: "Campo obligatorio",
    });
  });

  it("política → el mismo detail del 422 PASSWORD_POLICY; distintas → no coinciden", () => {
    expect(errors(schema.safeParse({ newPassword: "clave", confirmPassword: "otra" }))).toEqual({
      newPassword:
        "La contraseña no cumple los requisitos: al menos 8 caracteres, una letra mayúscula, un número, un carácter especial (por ejemplo ! @ # $ %).",
      confirmPassword: "Las contraseñas no coinciden.",
    });
  });
});

describe("changePasswordSchema", () => {
  const schema = changePasswordSchema(POLICY, { username: "jperez", dni: "12345678" });

  it("actual obligatoria; nueva con el usuario o igual a la actual → política", () => {
    expect(errors(schema.safeParse({ currentPassword: "", newPassword: "Jperez#2026", confirmPassword: "Jperez#2026" }))).toEqual({
      currentPassword: "Campo obligatorio",
      newPassword: "La contraseña no cumple los requisitos: no debe contener tu usuario ni tu DNI.",
    });
    expect(
      errors(schema.safeParse({ currentPassword: "Clave#2026", newPassword: "Clave#2026", confirmPassword: "Clave#2026" })),
    ).toEqual({ newPassword: "La contraseña no cumple los requisitos: distinta de la contraseña actual." });
  });

  it("válida", () => {
    expect(
      schema.safeParse({ currentPassword: "Temporal#2026", newPassword: "Clave#2026", confirmPassword: "Clave#2026" }).success,
    ).toBe(true);
  });
});
