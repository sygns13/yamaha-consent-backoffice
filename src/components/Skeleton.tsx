import type { ReactNode } from "react";
import { cx } from "../lib/cx";

/** Barra de carga decorativa (spec de rediseño, 4.10). Sin pulso con movimiento reducido. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none", className)} />
  );
}

/** Región `status` con "Cargando..." (Anexo A.1) para lectores de pantalla; lo visible es decorativo. */
function LoadingRegion({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">Cargando...</span>
      {children}
    </div>
  );
}

// Anchos variados para que las filas no se vean idénticas.
const CELL_WIDTHS = ["w-16", "w-28", "w-20", "w-24", "w-32", "w-14"];

interface TableSkeletonProps {
  /** El mismo nombre que la `DataTable` que reemplaza (nombre de la región `status`). */
  label: string;
  /** Encabezados de la tabla (los mismos textos que `DataTable`). */
  columns: readonly string[];
  rows?: number;
}

/**
 * Primera carga de una lista (4.10): mismo contenedor y encabezados que `DataTable`, con filas de barras. La tabla
 * visible queda oculta para lectores de pantalla (`aria-hidden`): solo se anuncia "Cargando...". Sin desplazamiento
 * (`overflow-hidden`): es decorativa, y una región desplazable sin foco de teclado es una falla de axe
 * (`scrollable-region-focusable`, visto en U3 a 360 px).
 */
export function TableSkeleton({ label, columns, rows = 5 }: TableSkeletonProps) {
  return (
    <LoadingRegion
      label={label}
      className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-card dark:shadow-none"
    >
      <table aria-hidden="true" className="min-w-full text-left text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="h-10 px-4 text-xs font-medium tracking-wider whitespace-nowrap text-fg-muted uppercase"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row} className="border-t border-border">
              {columns.map((column, index) => (
                <td key={column} className="px-4 py-3">
                  <Skeleton className={cx("h-4", CELL_WIDTHS[(row + index) % CELL_WIDTHS.length])} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </LoadingRegion>
  );
}

/** Primera carga de un detalle o de Mi perfil (4.10): grilla de pares etiqueta/valor como `DetailList`. */
export function DetailSkeleton({ items = 6, columns = 3 }: { items?: number; columns?: 2 | 3 }) {
  return (
    <LoadingRegion
      className={cx("grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}
    >
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className={cx("h-4", CELL_WIDTHS[index % CELL_WIDTHS.length])} />
        </div>
      ))}
    </LoadingRegion>
  );
}
