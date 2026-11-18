/** DNI de un usuario (sección 6.5), espejo de `validate_dni` de la API: 8 dígitos, con trim. Mensaje del Anexo A.3. */
export const DNI_INVALID = "El DNI debe tener 8 dígitos.";

const DNI = /^[0-9]{8}$/;

/** Mensaje de error o null si es válido. */
export function dniError(value: string): string | null {
  return DNI.test(value.trim()) ? null : DNI_INVALID;
}
