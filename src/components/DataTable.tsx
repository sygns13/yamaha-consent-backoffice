import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
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
  /**
   * `"end"`: columna fija a la derecha (spec de rediseño, P4), visible aunque la tabla se desplace en móvil. Solo CSS.
   */
  sticky?: "end";
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

/** Celda fija a la derecha: fondo opaco (el hover de la fila llega a la celda) y borde izquierdo bajo `xl`. */
const STICKY_END = "sticky right-0 border-l border-border xl:border-l-0";

/**
 * Tabla semántica (sección 8.7): `<th scope="col">`, columnas ordenables con un botón y `aria-sort`. En pantallas
 * angostas se desplaza dentro de su contenedor (enfocable con el teclado), nunca la página. Presentación de la spec de
 * rediseño, 4.16.
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
      className={cx(
        "relative overflow-x-auto rounded-xl border border-border bg-surface shadow-card dark:shadow-none",
        "transition-opacity duration-150 motion-reduce:transition-none",
        busy && "opacity-60",
      )}
    >
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((column) => {
              const sorted = sort !== undefined && column.sortKey !== undefined && sort.sortBy === column.sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sorted ? (sort.sortOrder === "asc" ? "ascending" : "descending") : undefined}
                  className={cx(
                    "h-10 px-4 text-xs font-medium tracking-wider whitespace-nowrap text-fg-muted uppercase",
                    column.sticky === "end" && cx(STICKY_END, "bg-surface-muted"),
                    column.className,
                  )}
                >
                  {column.sortKey !== undefined && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sortKey ?? "")}
                      className="-mx-1.5 inline-flex h-8 items-center gap-1 rounded-md px-1.5 font-medium tracking-wider uppercase transition-colors duration-150 hover:text-fg motion-reduce:transition-none"
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
                <tr className="group/row border-t border-border transition-colors duration-150 hover:bg-surface-muted motion-reduce:transition-none">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        "px-4 py-3 align-middle text-sm text-fg",
                        column.sticky === "end" &&
                          cx(
                            STICKY_END,
                            "bg-surface transition-colors duration-150 group-hover/row:bg-surface-muted motion-reduce:transition-none",
                          ),
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {expanded !== null && expanded !== undefined && (
                  <tr>
                    <td colSpan={columns.length} className="bg-surface-muted/40 px-4 py-3">
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

/** Orden de la columna (3.6): flecha en `fg` si está ordenada; sin orden, doble chevron en `fg-subtle`. */
function SortIcon({ state }: { state: SortOrder | null }) {
  if (state === "asc") return <ArrowUp className="size-4 shrink-0 text-fg" />;
  if (state === "desc") return <ArrowDown className="size-4 shrink-0 text-fg" />;
  return <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" />;
}
