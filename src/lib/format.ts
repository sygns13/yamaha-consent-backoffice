import type { UserRef } from "./api";

/** Valor vacío en vistas y tablas (aprobado en el spec v1.5; el mismo de `formatDateTime`). */
export const EMPTY_VALUE = "—";

export function displayValue(value: string | null | undefined): string {
  return value === null || value === undefined || value.trim() === "" ? EMPTY_VALUE : value;
}

export function fullName(person: { firstNames: string; lastNames: string }): string {
  return `${person.firstNames} ${person.lastNames}`;
}

/** Usuario de una referencia (`UserRef`): "Nombre Apellido (usuario)"; nula (la CLI) → "—". */
export function userRefLabel(ref: UserRef | null | undefined): string {
  return ref ? `${ref.fullName} (${ref.username})` : EMPTY_VALUE;
}

/**
 * Iniciales del avatar (helper visual, spec de rediseño 4.21): primera letra de los nombres y primera de los
 * apellidos, en mayúsculas. Cuenta puntos de código (no unidades UTF-16) y normaliza a NFC, así una tilde escrita
 * como carácter combinado no queda sola.
 */
export function initials(person: { firstNames: string; lastNames: string }): string {
  const first = (text: string) => Array.from(text.normalize("NFC").trim())[0] ?? "";
  return `${first(person.firstNames)}${first(person.lastNames)}`.toLocaleUpperCase("es-PE");
}

export function yesNo(value: boolean): string {
  return value ? "Sí" : "No";
}
