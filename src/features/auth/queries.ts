import { useQuery } from "@tanstack/react-query";
import { getPasswordPolicy } from "../../lib/api";
import { unwrap } from "../../lib/errors";

/** `GET /auth/password-policy` (público). Cambia solo con un nuevo despliegue de la API. */
export function usePasswordPolicy() {
  return useQuery({
    queryKey: ["password-policy"],
    queryFn: async () => unwrap(await getPasswordPolicy()),
    staleTime: Infinity,
  });
}
