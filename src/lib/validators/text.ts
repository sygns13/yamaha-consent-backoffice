/**
 * Nombres, usuario y correo (secciones 4.3 y 6.5), espejo de `app/utils/normalization.py` y `validation.py` de la API,
 * con los mensajes del Anexo A.3. El servidor es la validación que manda: aquí solo se adelanta el mismo mensaje.
 */
import { maxLengthMessage } from "../errors";

export const PERSON_NAME_INVALID = "El nombre solo puede contener letras, espacios, apóstrofo, punto y guion.";
export const USERNAME_INVALID =
  "El usuario debe tener de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo, y empezar con una letra.";
export const EMAIL_INVALID = "El correo no tiene un formato válido.";

export const PERSON_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

// Igual que el CHECK users.username_format (la API pasa el valor a minúsculas antes).
const USERNAME = /^[a-z][a-z0-9._-]{3,29}$/;
// Forma básica de la API: algo@dominio.tld, sin espacios.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Letras del alfabeto latino (con tildes, diéresis y Ñ), como `_is_latin_letter`.
const LETTER = /\p{L}/u;
const LATIN = /\p{Script=Latin}/u;
// Además de letras: espacio, apóstrofo (recto o tipográfico), punto y guion.
const NAME_SYMBOLS = new Set([" ", "'", "’", ".", "-"]);

/** Trim, espacios colapsados y NFC (`normalize_text`). */
export function normalizeText(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).join(" ").normalize("NFC");
}

/** Largo en caracteres, como `len()` de Python (puntos de código). */
export function textLength(value: string): number {
  return [...value].length;
}

function isLatinLetter(char: string): boolean {
  return LETTER.test(char) && LATIN.test(char);
}

/** Nombres, apellidos o persona de contacto (`validate_person_name`). Vacío → null: lo resuelve "obligatorio". */
export function personNameError(value: string, maxLength = PERSON_NAME_MAX_LENGTH): string | null {
  const name = normalizeText(value);
  if (name === "") return null;
  if (textLength(name) > maxLength) return maxLengthMessage(maxLength);
  const chars = [...name];
  const valid = chars.every((char) => isLatinLetter(char) || NAME_SYMBOLS.has(char)) && chars.some(isLatinLetter);
  return valid ? null : PERSON_NAME_INVALID;
}

/** Usuario (`normalize_username` + `validate_username`). */
export function usernameError(value: string): string | null {
  return USERNAME.test(value.trim().toLowerCase()) ? null : USERNAME_INVALID;
}

/** Correo (`normalize_email` + `validate_user_email`). */
export function emailError(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= EMAIL_MAX_LENGTH && EMAIL.test(email) ? null : EMAIL_INVALID;
}

/** Correo normalizado, para comparar con el guardado (la API lo guarda con trim y en minúsculas). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
