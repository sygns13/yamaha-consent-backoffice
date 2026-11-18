import { describe, expect, it } from "vitest";
import type { UserDetail } from "../../lib/api";
import { toCreateRequest, toUpdateRequest, userFormSchema, userToFormValues, type UserFormValues } from "./schema";

const VALID: UserFormValues = {
  dni: "12345678",
  firstNames: "Juan",
  lastNames: "Pérez Gómez",
  username: "jperez",
  email: "jperez@dominio.com",
  phone: "",
  roleCode: "OPERADOR",
};

const USER: UserDetail = {
  id: "6f0c0000-0000-4000-8000-000000000009",
  username: "jperez",
  firstNames: "Juan",
  lastNames: "Pérez Gómez",
  dni: "12345678",
  email: "jperez@dominio.com",
  role: { code: "OPERADOR", name: "Operador" },
  status: "ACTIVO",
  lastLoginAt: null,
  phone: "987654321",
  mustChangePassword: false,
  lockedUntil: null,
  createdAt: "2026-11-15T10:00:00-05:00",
  createdBy: null,
  updatedAt: "2026-11-15T10:00:00-05:00",
  updatedBy: null,
  version: 3,
};

function errors(values: UserFormValues, mode: "create" | "edit" = "create") {
  const result = userFormSchema(mode).safeParse(values);
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));
}

describe("userFormSchema (sección 6.5)", () => {
  it("válido; el celular es opcional", () => {
    expect(errors(VALID)).toEqual({});
  });

  it("obligatorios → 'Campo obligatorio' (también solo espacios)", () => {
    expect(errors({ dni: "", firstNames: " ", lastNames: "", username: "", email: "", phone: "", roleCode: "" })).toEqual({
      dni: "Campo obligatorio",
      firstNames: "Campo obligatorio",
      lastNames: "Campo obligatorio",
      username: "Campo obligatorio",
      email: "Campo obligatorio",
      roleCode: "Campo obligatorio",
    });
  });

  it("formatos con los mensajes del Anexo A.3", () => {
    expect(errors({ ...VALID, dni: "1234567a", firstNames: "Juan3", username: "1rosa", email: "no-es-un-correo", phone: "98711122" })).toEqual({
      dni: "El DNI debe tener 8 dígitos.",
      firstNames: "El nombre solo puede contener letras, espacios, apóstrofo, punto y guion.",
      username:
        "El usuario debe tener de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo, y empezar con una letra.",
      email: "El correo no tiene un formato válido.",
      phone: "El celular debe tener 9 dígitos.",
    });
  });

  it("al editar, el usuario no se valida (no se envía)", () => {
    expect(errors({ ...VALID, username: "" }, "edit")).toEqual({});
  });
});

describe("requests", () => {
  it("alta: celular vacío → null", () => {
    expect(toCreateRequest(VALID)).toEqual({ ...VALID, phone: null });
  });

  it("edición: sin usuario, con la versión; el propio usuario conserva su rol", () => {
    const values = { ...userToFormValues(USER), roleCode: "ADMIN" };
    expect(toUpdateRequest(values, USER, false)).toEqual({
      dni: "12345678",
      firstNames: "Juan",
      lastNames: "Pérez Gómez",
      email: "jperez@dominio.com",
      phone: "987654321",
      roleCode: "ADMIN",
      version: 3,
    });
    expect(toUpdateRequest(values, USER, true).roleCode).toBe("OPERADOR");
  });
});
