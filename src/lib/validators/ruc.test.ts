/**
 * Validación del RUC (Anexo B): los mismos casos que la API (`yamaha-consent-api/tests/test_bo_ruc.py`).
 */
import { describe, expect, it } from "vitest";
import { isValidRuc, normalizeRuc, RUC_INVALID, RUC_LENGTH_INVALID, rucCheckDigit, rucError } from "./ruc";

describe("RUC (Anexo B)", () => {
  it.each([
    // Ejemplos verificados del Anexo B.
    "20100047218",
    "20131312955",
    // r = 10 → dígito 0 y r = 11 → dígito 1.
    "20100000050",
    "20100000131",
    // Otro prefijo permitido.
    "10100000020",
    "10100000071",
  ])("%s es válido", (ruc) => {
    expect(isValidRuc(ruc)).toBe(true);
    expect(rucError(ruc)).toBeNull();
  });

  it("dígito verificador de los ejemplos del Anexo B", () => {
    // suma 69 → 69 mod 11 = 3 → 11 − 3 = 8; suma 94 → 94 mod 11 = 6 → 11 − 6 = 5.
    expect(rucCheckDigit("2010004721")).toBe(8);
    expect(rucCheckDigit("2013131295")).toBe(5);
    expect(rucCheckDigit("2010000005")).toBe(0);
    expect(rucCheckDigit("2010000013")).toBe(1);
  });

  it.each(["10", "15", "16", "17", "20"])("prefijo %s permitido", (prefix) => {
    const firstTen = `${prefix}12345678`;
    expect(isValidRuc(`${firstTen}${rucCheckDigit(firstTen)}`)).toBe(true);
  });

  it.each([
    ["20100047219", RUC_INVALID], // dígito verificador errado (esperado 8)
    ["30100047218", RUC_INVALID], // prefijo 30
    ["11100047218", RUC_INVALID], // prefijo 11
    ["2010004721", RUC_LENGTH_INVALID], // 10 dígitos
    ["201000472180", RUC_LENGTH_INVALID], // 12 dígitos
    ["2010004721A", RUC_LENGTH_INVALID], // letra
    ["20-10004721", RUC_LENGTH_INVALID], // guion
    ["２０１０００４７２１８", RUC_LENGTH_INVALID], // dígitos de ancho completo (no ASCII)
    ["", RUC_LENGTH_INVALID],
  ])("%j → %s", (ruc, message) => {
    expect(isValidRuc(ruc)).toBe(false);
    expect(rucError(ruc)).toBe(message);
  });

  it("mensajes del Anexo A.3", () => {
    expect(RUC_LENGTH_INVALID).toBe("El RUC debe tener 11 dígitos.");
    expect(RUC_INVALID).toBe("El RUC no es válido.");
  });

  it.each([
    [" 20100047218 ", "20100047218"],
    ["201 0004 7218", "20100047218"],
    ["20100047218\t", "20100047218"],
  ])("normalizeRuc(%j) quita los espacios", (value, expected) => {
    expect(normalizeRuc(value)).toBe(expected);
    expect(rucError(value)).toBeNull();
  });
});
