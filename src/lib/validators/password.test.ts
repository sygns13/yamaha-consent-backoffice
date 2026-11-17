import { describe, expect, it } from "vitest";
import type { PasswordPolicy } from "../api";
import { checklistItems, passwordViolations, policyErrorDetail } from "./password";

const POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

const USER = { username: "jperez", dni: "12345678" };

describe("passwordViolations (espejo de app/core/passwords.py, Anexo A.3)", () => {
  it.each(["Ñandú#2026", "Clave#2026", "Abcdef1!", "Abcdefghijklmnop1!xy", "Clave 2026#ok"])("%s cumple", (password) => {
    expect(passwordViolations(password, POLICY, USER)).toEqual([]);
  });

  it.each([
    ["Abcde1!", ["al menos 8 caracteres"]],
    ["Abcdefghijklmnop1!xyz", ["como máximo 20 caracteres"]],
    ["abcdef1!", ["una letra mayúscula"]],
    ["ABCDEF1!", ["una letra minúscula"]],
    ["Abcdefg!", ["un número"]],
    ["Abcdefg1", ["un carácter especial (por ejemplo ! @ # $ %)"]],
    [" Abcdef1!", ["sin espacios al inicio ni al final"]],
    ["Abcdef1! ", ["sin espacios al inicio ni al final"]],
    ["\tAbcdef1!", ["sin espacios al inicio ni al final"]],
    ["Xjperez1!", ["no debe contener tu usuario ni tu DNI"]],
    ["XJPEREZ1!a", ["no debe contener tu usuario ni tu DNI"]],
    ["A12345678b!", ["no debe contener tu usuario ni tu DNI"]],
    ["", ["al menos 8 caracteres", "una letra mayúscula", "una letra minúscula", "un número", "un carácter especial (por ejemplo ! @ # $ %)"]],
  ])("%j → %j", (password, expected) => {
    expect(passwordViolations(password, POLICY, USER)).toEqual(expected);
  });

  it("número = solo 0-9 y ² no es carácter especial (categoría N, como en la API)", () => {
    expect(passwordViolations("Abcdefg²", POLICY)).toEqual(["un número", "un carácter especial (por ejemplo ! @ # $ %)"]);
  });

  it("cuenta caracteres, no unidades UTF-16 (como len() de Python)", () => {
    expect(passwordViolations("Abc1!😀😀😀", POLICY)).toEqual([]);
    expect(passwordViolations("Abc1!😀😀", POLICY)).toEqual(["al menos 8 caracteres"]);
  });

  it("distinta de la actual solo si se conoce la actual", () => {
    expect(passwordViolations("Clave#2026", POLICY, { currentPassword: "Clave#2026" })).toEqual([
      "distinta de la contraseña actual",
    ]);
    expect(passwordViolations("Clave#2026", POLICY, { currentPassword: "" })).toEqual([]);
  });

  it("respeta los flags de la política", () => {
    const relaxed = { ...POLICY, minLength: 10, requireSpecial: false, requireUppercase: false };
    expect(passwordViolations("abcdefgh1", relaxed)).toEqual(["al menos 10 caracteres"]);
  });

  it("policyErrorDetail arma el texto del 422 PASSWORD_POLICY", () => {
    expect(policyErrorDetail(["al menos 8 caracteres", "un número"])).toBe(
      "La contraseña no cumple los requisitos: al menos 8 caracteres, un número.",
    );
  });
});

describe("checklistItems (Anexo A.2)", () => {
  const labels = [
    "Al menos 8 caracteres",
    "Como máximo 20 caracteres",
    "Una letra mayúscula",
    "Una letra minúscula",
    "Un número",
    "Un carácter especial (por ejemplo ! @ # $ %)",
    "No debe contener tu usuario ni tu DNI",
  ];

  it("textos y orden del Anexo A.2; vacía → todo pendiente", () => {
    const items = checklistItems("", POLICY, USER);
    expect(items.map((item) => item.label)).toEqual(labels);
    expect(items.every((item) => item.state === "unmet")).toBe(true);
  });

  it("válida → todo cumplido", () => {
    expect(checklistItems("Clave#2026", POLICY, USER).every((item) => item.state === "met")).toBe(true);
  });

  it("con el usuario → solo ese ítem pendiente", () => {
    const unmet = checklistItems("Jperez#2026", POLICY, USER).filter((item) => item.state !== "met");
    expect(unmet.map((item) => item.key)).toEqual(["personalData"]);
  });

  it("sin datos del usuario (Restablecer) → ese ítem queda neutral (decisión D2)", () => {
    const personal = checklistItems("Clave#2026", POLICY).find((item) => item.key === "personalData");
    expect(personal?.state).toBe("unknown");
  });

  it("muestra el mínimo de la política y omite los requisitos apagados", () => {
    const items = checklistItems("x", { ...POLICY, minLength: 12, requireDigit: false });
    expect(items[0]?.label).toBe("Al menos 12 caracteres");
    expect(items.map((item) => item.key)).not.toContain("digit");
  });
});
