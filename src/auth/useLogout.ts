import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/Toast";
import { logout } from "../lib/api";
import { NETWORK_ERROR_MESSAGE, unwrap } from "../lib/errors";
import { endSession } from "./session";

/**
 * Cerrar sesión (sección 8.3): `POST /auth/logout` (idempotente) y `/login`. La redirección la hace `RequireAuth` al
 * ver la sesión terminada; la caché se limpia al llegar al login. Si falla la red, la sesión sigue y se avisa.
 */
export function useLogout() {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async () => unwrap(await logout()),
    meta: { ignoreAuthErrors: true },
    onSuccess: () => endSession(client, "logout"),
    onError: () => toast.show(NETWORK_ERROR_MESSAGE, "error"),
  });
}
