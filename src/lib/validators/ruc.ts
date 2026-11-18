/**
 * Validación del RUC (Anexo B), la misma función que la API (`app/utils/ruc.py`) con los mismos casos de prueba.
 *
 * 1. Se quitan los espacios; debe tener exactamente 11 dígitos.
 * 2. Prefijo 10, 15, 16, 17 o 20.
 * 3. Dígito verificador: pesos [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] sobre los 10 primeros; r = 11 − (suma mod 11);
 *    r = 10 → 0, r = 11 → 1. El undécimo dígito debe ser r.
 */
export const RUC_LENGTH_INVALID = "El RUC debe tener 11 dígitos.";
export const RUC_INVALID = "El RUC no es válido.";

const PREFIXES = new Set(["10", "15", "16", "17", "20"]);
const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
// Solo dígitos ASCII (como la API): los de ancho completo u otros alfabetos no valen.
const SHAPE = /^[0-9]{11}$/;

/** Quita los espacios (" 20100047218 " y "201 0004 7218" → "20100047218"). */
export function normalizeRuc(value: string): string {
  return value.replace(/\s+/g, "");
}

/** Dígito verificador de los 10 primeros dígitos. */
export function rucCheckDigit(firstTen: string): number {
  const sum = WEIGHTS.reduce((total, weight, index) => total + Number(firstTen[index]) * weight, 0);
  const remainder = 11 - (sum % 11);
  if (remainder === 10) return 0;
  if (remainder === 11) return 1;
  return remainder;
}

/** `ruc` ya normalizado. */
export function isValidRuc(ruc: string): boolean {
  return SHAPE.test(ruc) && PREFIXES.has(ruc.slice(0, 2)) && rucCheckDigit(ruc.slice(0, 10)) === Number(ruc[10]);
}

/** Mensaje del Anexo A.3 o null si es válido (normaliza antes). */
export function rucError(value: string): string | null {
  const ruc = normalizeRuc(value);
  if (!SHAPE.test(ruc)) return RUC_LENGTH_INVALID;
  return isValidRuc(ruc) ? null : RUC_INVALID;
}
