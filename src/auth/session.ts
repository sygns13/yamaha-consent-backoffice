/**
 * Estado de sesión (sección 8.3): vive solo en la caché de TanStack Query `["me"]`, sin contexto aparte ni
 * localStorage. Un 401 de `GET /auth/me` no es un error: es "sin sesión", y las guardas redirigen al login.
 *
 * Toda redirección por sesión la hace `RequireAuth` leyendo este estado (nunca el manejador global), así el destino es
 * siempre uno solo: `reason` dice si va con `motivo=sesion-expirada` (sección 8.2), con `next` o sin nada (logout).
 */
import type { QueryClient } from "@tanstack/react-query";
import { getMe, type Me } from "../lib/api";
import { ApiError } from "../lib/errors";
import type { LoginReason } from "../lib/navigation";

export const ME_QUERY_KEY = ["me"] as const;

export type SessionState = { status: "authenticated"; me: Me } | { status: "anonymous"; reason: LoginReason };

/**
 * `queryFn` de `["me"]`. 401 → sin sesión: vencida si la API dice `SESSION_EXPIRED` (había cookie) o si antes había
 * sesión en esta pestaña; si no, `none`. Red o 5xx → lanza `ApiError` (la pantalla muestra "Reintentar").
 */
export async function fetchSession(client: QueryClient): Promise<SessionState> {
  const result = await getMe();
  if (result.ok) return { status: "authenticated", me: result.data };
  if (result.kind === "HTTP" && result.status === 401) {
    const previous = client.getQueryData<SessionState>(ME_QUERY_KEY);
    const expired = result.code === "SESSION_EXPIRED" || previous?.status === "authenticated";
    return { status: "anonymous", reason: expired ? "expired" : "none" };
  }
  throw new ApiError(result);
}

/** Login correcto (sección 8.3: `setQueryData(["me"], me)`). Antes borra lo que haya quedado de otra sesión. */
export function startSession(client: QueryClient, me: Me): void {
  removeNonSessionQueries(client);
  const session: SessionState = { status: "authenticated", me };
  client.setQueryData<SessionState>(ME_QUERY_KEY, session);
}

/** Sin sesión (401 en cualquier petición, o logout): `RequireAuth` manda al login según `reason`. */
export function endSession(client: QueryClient, reason: LoginReason): void {
  const session: SessionState = { status: "anonymous", reason };
  client.setQueryData<SessionState>(ME_QUERY_KEY, session);
}

/** Datos nuevos del usuario actual (p. ej. tras editar Mi perfil, que responde `Me`). */
export function updateSessionUser(client: QueryClient, me: Me): void {
  client.setQueryData<SessionState>(ME_QUERY_KEY, (session) =>
    session?.status === "authenticated" ? { status: "authenticated", me } : session,
  );
}

/** Cambia `mustChangePassword` del usuario en caché (403 `PASSWORD_CHANGE_REQUIRED` o cambio de contraseña hecho). */
export function setMustChangePassword(client: QueryClient, mustChangePassword: boolean): void {
  client.setQueryData<SessionState>(ME_QUERY_KEY, (session) =>
    session?.status === "authenticated" ? { ...session, me: { ...session.me, mustChangePassword } } : session,
  );
}

/**
 * Limpia la caché salvo `["me"]` (sección 8.2: 401 → limpiar la caché). Se llama al llegar al login sin sesión, cuando
 * ya no queda ninguna pantalla protegida montada que vuelva a pedir sus datos.
 */
export function removeNonSessionQueries(client: QueryClient): void {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_QUERY_KEY[0] });
}
