/**
 * Teléfonos (secciones 4.3 y 6.5), espejo de `normalize_phone` y `validate_mobile` de la API. Mensajes del Anexo A.3.
 * El servidor es la validación que manda.
 */
export const MOBILE_INVALID = "El celular debe tener 9 dígitos.";

const MOBILE_DIGITS = 9;
/**
 * Prefijo de país que la API quita delante de un celular de 9 dígitos: el valor por defecto de su variable
 * `PHONE_COUNTRY_PREFIX` (decisión D7, spec v1.5).
 */
const COUNTRY_PREFIX = "51";

/** Solo los dígitos ASCII, sin el prefijo de país si viene delante de 9 dígitos ("+51 987-654-321" → "987654321"). */
export function normalizeMobile(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === COUNTRY_PREFIX.length + MOBILE_DIGITS && digits.startsWith(COUNTRY_PREFIX)) {
    return digits.slice(COUNTRY_PREFIX.length);
  }
  return digits;
}

/** Celular opcional de un usuario: vacío → null (sin celular); si no, 9 dígitos tras normalizar. */
export function mobileError(value: string): string | null {
  if (value.trim() === "") return null;
  return normalizeMobile(value).length === MOBILE_DIGITS ? null : MOBILE_INVALID;
}

// --- Teléfono de contacto del Dealer (sección 4.3, propuesta), espejo de `normalize_contact_phone` y
// `validate_contact_phone` ---

export const CONTACT_PHONE_INVALID = "El teléfono debe tener entre 6 y 15 dígitos.";

const CONTACT_PHONE = /^\+?[0-9]{6,15}$/;

/** Sin espacios, guiones, puntos ni paréntesis ("+51 1 456.7890" → "+5114567890"). */
export function normalizeContactPhone(value: string): string {
  return value.replace(/[\s\-.()]/g, "");
}

/** Opcional: vacío tras normalizar → null (sin teléfono); si no, un "+" opcional y de 6 a 15 dígitos. */
export function contactPhoneError(value: string): string | null {
  const phone = normalizeContactPhone(value);
  if (phone === "") return null;
  return CONTACT_PHONE.test(phone) ? null : CONTACT_PHONE_INVALID;
}
