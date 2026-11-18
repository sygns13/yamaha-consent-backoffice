import { Fragment, type ReactNode } from "react";
import type { SortOrder } from "../lib/api";
import { cx } from "../lib/cx";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Valor de `sortBy` de la API si la columna se puede ordenar. */
  sortKey?: string;
  className?: string;
}

interface DataTableProps<T> {
  /** Nombre accesible de la región desplazable (el título de la pantalla). */
  label: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  sort?: { sortBy: string; sortOrder: SortOrder };
  onSort?: (sortKey: string) => void;
  /** Contenido de una fila extra debajo de la fila (p. ej. el detalle de la bitácora); null = sin fila extra. */
  renderExpanded?: (row: T) => ReactNode;
  /** Mientras llega otra página o filtro (se siguen viendo los datos anteriores). */
  busy?: boolean;
}

/**
 * Tabla semántica (sección 8.7): `<th scope="col">`, columnas ordenables con un botón y `aria-sort`. En pantallas
 * angostas se desplaza dentro de su contenedor (enfocable con el teclado), nunca la página.
 */
export function DataTable<T>({ label, columns, rows, rowKey, sort, onSort, renderExpanded, busy = false }: DataTableProps<T>) {
  return (
    <div
      role="region"
      aria-label={label}
      aria-busy={busy || undefined}
      tabIndex={0}
      // `relative`: los textos `sr-only` (posición absoluta) de las celdas quedan dentro del contenedor desplazable; si
      // no, ensanchan la página en pantallas angostas.
      className={cx("relative overflow-x-auto rounded-lg border border-slate-200 bg-white", busy && "opacity-70")}
    >
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface">
          <tr>
            {columns.map((column) => {
              const sorted = sort !== undefined && column.sortKey !== undefined && sort.sortBy === column.sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sorted ? (sort.sortOrder === "asc" ? "ascending" : "descending") : undefined}
                  className={cx("px-3 py-2 font-semibold whitespace-nowrap text-slate-800", column.className)}
                >
                  {column.sortKey !== undefined && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sortKey ?? "")}
                      className="inline-flex min-h-8 items-center gap-1 rounded font-semibold hover:text-brand"
                    >
                      {column.header}
                      <SortIcon state={sorted ? sort.sortOrder : null} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const expanded = renderExpanded?.(row);
            return (
              <Fragment key={key}>
                <tr className="border-t border-slate-200">
                  {columns.map((column) => (
                    <td key={column.key} className={cx("px-3 py-2 align-top text-slate-800", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {expanded !== null && expanded !== undefined && (
                  <tr>
                    <td colSpan={columns.length} className="bg-surface px-3 py-2">
                      {expanded}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ state }: { state: SortOrder | null }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0" fill="currentColor">
      <path d="M10 4l4 5H6z" className={state === "desc" ? "opacity-30" : state === null ? "opacity-40" : ""} />
      <path d="M10 16l-4-5h8z" className={state === "asc" ? "opacity-30" : state === null ? "opacity-40" : ""} />
    </svg>
  );
}
