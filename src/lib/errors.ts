import type { ApiFailure, ApiResult } from "./api";

/** Anexo A.1. */
export const NETWORK_ERROR_MESSAGE = "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.";

/** Texto del traductor de errores de la API para un campo obligatorio (`missing`). */
export const REQUIRED_MESSAGE = "Campo obligatorio";

/** Texto del traductor de errores de la API para un texto demasiado largo (`string_too_long`). */
export function maxLengthMessage(max: number): string {
  return `Debe tener como máximo ${max} caracteres`;
}

/**
 * Error que lanzan las funciones de TanStack Query con el fallo de `api.ts`. El manejo global (401 y
 * `PASSWORD_CHANGE_REQUIRED`, `src/app/queryClient.ts`) solo funciona si la consulta o mutación lanza este error.
 */
export class ApiError extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure) {
    super(failure.code ?? `${failure.kind} ${failure.status}`);
    this.name = "ApiError";
    this.failure = failure;
  }
}

/** Devuelve los datos o lanza `ApiError` (para `queryFn` y `mutationFn`). */
export function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data;
  throw new ApiError(result);
}

/** El fallo de un error de TanStack Query. Cualquier otro error se trata como fallo de red. */
export function failureOf(error: unknown): ApiFailure {
  if (error instanceof ApiError) return error.failure;
  return { ok: false, kind: "NETWORK", status: 0 };
}

/** Red, timeout o 5xx: el usuario solo puede reintentar (mismo criterio que la landing). */
export function isConnectionFailure(failure: ApiFailure): boolean {
  return failure.kind === "NETWORK" || failure.status >= 500;
}

export function isHttpStatus(failure: ApiFailure, status: number, code?: string): boolean {
  return failure.kind === "HTTP" && failure.status === status && (code === undefined || failure.code === code);
}

/** Mensaje general de un fallo: el de conexión si no hubo respuesta útil; si no, el `detail` de la API. */
export function failureMessage(failure: ApiFailure): string {
  if (isConnectionFailure(failure) || failure.detail === undefined) return NETWORK_ERROR_MESSAGE;
  return failure.detail;
}
