import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listAuditLogs, listUsers, type AuditLogParams, type UserSummary } from "../../lib/api";
import { unwrap } from "../../lib/errors";

const ALL_USERS_PAGE_SIZE = 100;

/**
 * Todos los usuarios vigentes para el filtro "Usuario" de la bitácora (decisión D1, v1.5): `GET /users` página por
 * página (decenas de usuarios, sección 1.5 → una sola petición). No incluye los eliminados. Exige el módulo
 * `USUARIOS`: sin él no se pide (`enabled`) y la pantalla usa los actores de los resultados.
 */
async function fetchAllUsers(): Promise<UserSummary[]> {
  const users: UserSummary[] = [];
  for (let page = 1; ; page += 1) {
    const data = unwrap(await listUsers({ page, pageSize: ALL_USERS_PAGE_SIZE, sortBy: "lastNames", sortOrder: "asc" }));
    users.push(...data.items);
    if (data.items.length === 0 || users.length >= data.total) return users;
  }
}

export function useAllUsers(enabled: boolean) {
  return useQuery({ queryKey: ["users", "all"], queryFn: fetchAllUsers, staleTime: 5 * 60_000, enabled });
}

export function useAuditLogs(params: AuditLogParams, enabled: boolean) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: async () => unwrap(await listAuditLogs(params)),
    placeholderData: keepPreviousData,
    enabled,
  });
}
