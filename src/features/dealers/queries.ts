import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDealer, listDealers, listDepartments, listDistricts, listProvinces, type DealerListParams } from "../../lib/api";
import { unwrap } from "../../lib/errors";

/** Claves de TanStack Query del módulo. */
export const dealerKeys = {
  lists: ["dealers", "list"] as const,
  list: (params: DealerListParams) => ["dealers", "list", params] as const,
  detail: (dealerId: string) => ["dealers", "detail", dealerId] as const,
};

/** `GET /dealers`. Mientras llega otra página o filtro se siguen viendo los datos anteriores. */
export function useDealers(params: DealerListParams) {
  return useQuery({
    queryKey: dealerKeys.list(params),
    queryFn: async () => unwrap(await listDealers(params)),
    placeholderData: keepPreviousData,
  });
}

export function useDealer(dealerId: string) {
  return useQuery({
    queryKey: dealerKeys.detail(dealerId),
    queryFn: async () => unwrap(await getDealer(dealerId)),
  });
}

// Ubigeo (sección 6.7): catálogo fijo, cargado desde la fuente de la sección 4.8; no cambia en la sesión.

export function useDepartments() {
  return useQuery({
    queryKey: ["ubigeo", "departments"],
    queryFn: async () => unwrap(await listDepartments()),
    staleTime: Infinity,
  });
}

export function useProvinces(departmentCode: string) {
  return useQuery({
    queryKey: ["ubigeo", "provinces", departmentCode],
    queryFn: async () => unwrap(await listProvinces(departmentCode)),
    staleTime: Infinity,
    enabled: departmentCode !== "",
  });
}

export function useDistricts(provinceCode: string) {
  return useQuery({
    queryKey: ["ubigeo", "districts", provinceCode],
    queryFn: async () => unwrap(await listDistricts(provinceCode)),
    staleTime: Infinity,
    enabled: provinceCode !== "",
  });
}
