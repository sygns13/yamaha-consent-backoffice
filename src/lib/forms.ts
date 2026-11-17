import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiFailure } from "./api";

/**
 * Lleva los errores de campo de la API (`field` propio o `loc` del 422 de Pydantic, sección 8.2) al formulario.
 * Solo aplica los de `fields` (camelCase, como en el request). Devuelve true si aplicó alguno; enfoca el primero.
 */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  failure: ApiFailure,
  fields: readonly Path<T>[],
): boolean {
  let applied = false;
  for (const field of fields) {
    const message = failure.fieldErrors?.[field];
    if (message === undefined) continue;
    setError(field, { type: "server", message }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}
