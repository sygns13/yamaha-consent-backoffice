import { describe, expect, it } from "vitest";
import { emailChanged, profileSchema, toProfileRequest, type ProfileFormValues } from "./schema";

const CURRENT_EMAIL = "admin@backoffice.local";
const VALUES: ProfileFormValues = {
  firstNames: "Administrador",
  lastNames: "General",
  email: CURRENT_EMAIL,
  phone: "",
  currentPassword: "",
};

function errors(values: ProfileFormValues) {
  const result = profileSchema(CURRENT_EMAIL).safeParse(values);
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));
}

describe("Mi perfil (sección 6.4)", () => {
  it("el correo cambia solo si difiere tras trim y minúsculas", () => {
    expect(emailChanged("  ADMIN@backoffice.local ", CURRENT_EMAIL)).toBe(false);
    expect(emailChanged("otro@backoffice.local", CURRENT_EMAIL)).toBe(true);
  });

  it("sin cambiar el correo, la contraseña actual no se pide ni se envía", () => {
    expect(errors(VALUES)).toEqual({});
    expect(toProfileRequest({ ...VALUES, currentPassword: "Clave#2026" }, CURRENT_EMAIL)).toEqual({
      firstNames: "Administrador",
      lastNames: "General",
      email: CURRENT_EMAIL,
      phone: null,
    });
  });

  it("con otro correo, la contraseña actual es obligatoria y se envía", () => {
    const changed = { ...VALUES, email: "nuevo@backoffice.local" };
    expect(errors(changed)).toEqual({ currentPassword: "Campo obligatorio" });
    expect(toProfileRequest({ ...changed, currentPassword: "Clave#2026" }, CURRENT_EMAIL)).toMatchObject({
      email: "nuevo@backoffice.local",
      currentPassword: "Clave#2026",
    });
  });

  it("nombres, correo y celular con los mensajes de la API", () => {
    expect(errors({ ...VALUES, firstNames: "", lastNames: "Gómez2", email: "x", phone: "123", currentPassword: "Clave#2026" })).toEqual({
      firstNames: "Campo obligatorio",
      lastNames: "El nombre solo puede contener letras, espacios, apóstrofo, punto y guion.",
      email: "El correo no tiene un formato válido.",
      phone: "El celular debe tener 9 dígitos.",
    });
  });
});
