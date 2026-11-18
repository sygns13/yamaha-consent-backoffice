import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getUser, listRoles, listUsers, type UserListParams } from "../../lib/api";
import { unwrap } from "../../lib/errors";

/** Claves de TanStack Query del módulo. Invalidar `["users"]` refresca listas, detalles y el select de la bitácora. */
export const userKeys = {
  all: ["users"] as const,
  lists: ["users", "list"] as const,
  list: (params: UserListParams) => ["users", "list", params] as const,
  detail: (userId: string) => ["users", "detail", userId] as const,
};

/** `GET /roles`: catálogo fijo (sección 3.1). */
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => unwrap(await listRoles()),
    staleTime: Infinity,
  });
}

/** `GET /users`. Mientras llega otra página o filtro se siguen viendo los datos anteriores. */
export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => unwrap(await listUsers(params)),
    placeholderData: keepPreviousData,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => unwrap(await getUser(userId)),
  });
}
