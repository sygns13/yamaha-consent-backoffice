/**
 * Filtros, orden y página de las listas en la URL (secciones 6.1 y 8.6): "Atrás" y los enlaces compartidos
 * restauran el estado. Cada cambio confirmado agrega una entrada al historial (decisión D6, spec v1.5).
 */
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import type { SortOrder } from "./api";

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** Número de páginas (al menos 1). */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Texto de la URL (sin espacios en los extremos); ausente → "". */
export function readText(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() ?? "";
}

/** Uno de `values`; cualquier otro valor se ignora (sin filtro). */
export function readEnum<T extends string>(params: URLSearchParams, key: string, values: readonly T[]): T | undefined {
  const value = params.get(key);
  return values.find((candidate) => candidate === value);
}

/** Página ≥ 1 (por defecto 1). */
export function readPage(params: URLSearchParams): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** 10, 20, 50 o 100 (por defecto 20). */
export function readPageSize(params: URLSearchParams): number {
  const size = Number(params.get("pageSize"));
  return PAGE_SIZES.find((candidate) => candidate === size) ?? DEFAULT_PAGE_SIZE;
}

export interface SortState<T extends string> {
  sortBy: T;
  sortOrder: SortOrder;
}

export function readSort<T extends string>(params: URLSearchParams, values: readonly T[], defaultBy: T): SortState<T> {
  return {
    sortBy: readEnum(params, "sortBy", values) ?? defaultBy,
    sortOrder: readEnum(params, "sortOrder", ["asc", "desc"] as const) ?? "asc",
  };
}

/** Siguiente orden al pulsar una columna: la misma columna invierte el sentido; otra empieza ascendente. */
export function nextSort<T extends string>(current: SortState<T>, column: T): SortState<T> {
  if (current.sortBy === column) return { sortBy: column, sortOrder: current.sortOrder === "asc" ? "desc" : "asc" };
  return { sortBy: column, sortOrder: "asc" };
}

export type ParamsPatch = Record<string, string | number | null | undefined>;

export interface UpdateOptions {
  /** Sin entrada nueva en el historial (p. ej. los valores por defecto al entrar). */
  replace?: boolean;
  /** Claves que se conservan aunque queden vacías (`?from=` = sin filtro, distinto de "ausente"). */
  keepEmpty?: readonly string[];
}

/**
 * Parámetros de la URL y una función para cambiarlos. Un valor vacío o nulo quita el parámetro. Si el cambio no trae
 * `page`, la página vuelve a 1 (un filtro u orden nuevo empieza desde el principio).
 */
export function useUrlParams() {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (patch: ParamsPatch, options: UpdateOptions = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            const keep = value === "" && options.keepEmpty?.includes(key);
            if (value === undefined || value === null || (value === "" && !keep)) next.delete(key);
            else next.set(key, String(value));
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: options.replace },
      );
    },
    [setParams],
  );
  return [params, update] as const;
}

/**
 * Si la página de la URL quedó fuera de rango (p. ej. tras eliminar el último registro de la última página), va a la
 * última página que tiene datos, sin entrada nueva en el historial.
 */
export function useClampPage(
  data: { items: readonly unknown[]; total: number } | undefined,
  page: number,
  pageSize: number,
  update: (patch: ParamsPatch, options?: UpdateOptions) => void,
): void {
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      const last = pageCount(data.total, pageSize);
      update({ page: last === 1 ? null : last }, { replace: true });
    }
  }, [data, page, pageSize, update]);
}
