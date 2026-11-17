/**
 * `next` del login (sección 8.4): solo rutas internas. Debe empezar con `/` y no con `//` ni `/\` (el navegador
 * trata `/\dominio` como `//dominio`), para no permitir redirecciones abiertas. Si no sirve, devuelve null.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value?.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

/** Por qué se manda al login: sin sesión, sesión vencida o cierre de sesión. */
export type LoginReason = "none" | "expired" | "logout";

/**
 * Ruta del login. Sin sesión → `?next=`; sesión vencida → `?motivo=sesion-expirada&next=` (sección 8.2);
 * cierre de sesión → `/login` sin parámetros (sección 8.3). `next` se omite si es la ruta de Inicio.
 */
export function loginPath(reason: LoginReason, next?: string): string {
  if (reason === "logout") return "/login";
  const params = new URLSearchParams();
  if (reason === "expired") params.set("motivo", "sesion-expirada");
  const safe = safeNext(next);
  if (safe !== null && safe !== "/") params.set("next", safe);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
