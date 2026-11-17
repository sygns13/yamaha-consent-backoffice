import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { endSession, setMustChangePassword } from "../auth/session";
import { ApiError } from "../lib/errors";

export interface AppMeta extends Record<string, unknown> {
  /** El login maneja su propio 401 (credenciales incorrectas): no es una sesión vencida. */
  ignoreAuthErrors?: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: AppMeta;
    mutationMeta: AppMeta;
  }
}

/**
 * Manejo global (sección 8.2), para toda consulta o mutación que lance `ApiError`:
 * - 401 (salvo el login) → sesión vencida: `RequireAuth` manda a `/login?motivo=sesion-expirada&next=<ruta actual>`
 *   y la caché se limpia al llegar al login.
 * - 403 `PASSWORD_CHANGE_REQUIRED` → `RequirePasswordChanged` manda a `/cambiar-contrasena`.
 * `GET /auth/me` no pasa por aquí con un 401: su `queryFn` lo convierte en "sin sesión" (`auth/session.ts`).
 */
export function handleGlobalError(client: QueryClient, error: unknown, meta: AppMeta | undefined): void {
  if (meta?.ignoreAuthErrors || !(error instanceof ApiError) || error.failure.kind !== "HTTP") return;
  const { status, code } = error.failure;
  if (status === 401) endSession(client, "expired");
  else if (status === 403 && code === "PASSWORD_CHANGE_REQUIRED") setMustChangePassword(client, true);
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleGlobalError(client, error, query.meta),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => handleGlobalError(client, error, mutation.meta),
    }),
    defaultOptions: {
      // Sin reintentos automáticos: cada pantalla muestra el error con "Reintentar" (sección 8.6).
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return client;
}
