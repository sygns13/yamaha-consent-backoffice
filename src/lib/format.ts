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

export function yesNo(value: boolean): string {
  return value ? "Sí" : "No";
}
