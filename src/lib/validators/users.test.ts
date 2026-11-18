/**
 * Validadores de usuario: los mismos casos que la API (`tests/test_bo_users.py::test_create_user_validation`,
 * `tests/test_normalization.py::test_normalize_phone`, `tests/test_bo_passwords.py`) con sus mensajes (Anexo A.3).
 */
import { describe, expect, it } from "vitest";
import { dniError } from "./dni";
import { mobileError, normalizeMobile } from "./phone";
import { emailError, normalizeText, personNameError, usernameError } from "./text";

const NAME_INVALID = "El nombre solo puede contener letras, espacios, apóstrofo, punto y guion.";
const USERNAME_INVALID =
  "El usuario debe tener de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo, y empezar con una letra.";

describe("dniError", () => {
  it.each(["12345678", " 00000000 "])("%j válido", (value) => {
    expect(dniError(value)).toBeNull();
  });

  it.each(["1234567", "1234567a", "123456789", "١٢٣٤٥٦٧٨"])("%j → mensaje del Anexo A.3", (value) => {
    expect(dniError(value)).toBe("El DNI debe tener 8 dígitos.");
  });
});

describe("personNameError", () => {
  it.each(["Juan", "Huamán Ñique", "O’Brien-Ñahui Jr.", "D'Alessandro", "  María   José  ", "Müller"])("%j válido", (value) => {
    expect(personNameError(value)).toBeNull();
  });

  it.each(["Juan3", "Ана", "Juan_Pérez", "...", "-'"])("%j → solo letras y símbolos permitidos", (value) => {
    expect(personNameError(value)).toBe(NAME_INVALID);
  });

  it("máximo 100 (o 150 para la persona de contacto), en caracteres", () => {
    expect(personNameError("a".repeat(100))).toBeNull();
    expect(personNameError("a".repeat(101))).toBe("Debe tener como máximo 100 caracteres");
    expect(personNameError("a".repeat(150), 150)).toBeNull();
    expect(personNameError("ñ".repeat(101))).toBe("Debe tener como máximo 100 caracteres");
  });

  it("vacío lo resuelve el campo obligatorio", () => {
    expect(personNameError("   ")).toBeNull();
  });

  it("normalizeText: trim, espacios colapsados y NFC", () => {
    expect(normalizeText("  Ana \t María  ")).toBe("Ana María");
    expect(normalizeText("José")).toBe("José");
  });
});

describe("usernameError", () => {
  it.each(["rosa", "jperez", "j.perez_2-x", " JPerez ", "a".repeat(30)])("%j válido (trim y minúsculas)", (value) => {
    expect(usernameError(value)).toBeNull();
  });

  it.each(["1rosa", "ros", "j perez", "a".repeat(31), "josé", "_rosa"])("%j → mensaje del Anexo A.3", (value) => {
    expect(usernameError(value)).toBe(USERNAME_INVALID);
  });
});

describe("emailError", () => {
  it.each(["jperez@dominio.com", " JPerez@Dominio.COM "])("%j válido", (value) => {
    expect(emailError(value)).toBeNull();
  });

  it.each(["no-es-un-correo", "a@b", "a b@c.com", "a@@b.com", `${"a".repeat(250)}@b.com`])("%j inválido", (value) => {
    expect(emailError(value)).toBe("El correo no tiene un formato válido.");
  });
});

describe("normalizeMobile y mobileError (prefijo 51, decisión D7)", () => {
  it.each([
    ["+51 987-654-321", "987654321"],
    ["+51 987 654 321", "987654321"],
    ["51987654321", "987654321"],
    ["(+51) 987.654.321", "987654321"],
    ["987654321", "987654321"],
    ["987 654 321", "987654321"],
    ["519876543", "519876543"],
    ["52987654321", "52987654321"],
    ["0051987654321", "0051987654321"],
    ["5198765432", "5198765432"],
    ["٩٨٧٦٥٤٣٢١", ""],
    ["abc", ""],
  ])("normalizeMobile(%j) → %j", (value, expected) => {
    expect(normalizeMobile(value)).toBe(expected);
  });

  it("opcional: vacío es válido; si no, 9 dígitos", () => {
    expect(mobileError("")).toBeNull();
    expect(mobileError("+51 987 654 321")).toBeNull();
    expect(mobileError("98711122")).toBe("El celular debe tener 9 dígitos.");
    expect(mobileError("52987654321")).toBe("El celular debe tener 9 dígitos.");
  });
});
