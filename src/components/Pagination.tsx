import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { cx } from "../lib/cx";
import { PAGE_SIZES, pageCount } from "../lib/listParams";
import { Button } from "./Button";
import { INPUT_COMPACT_CLASSES } from "./styles";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Paginación (Anexo A.1: "Mostrando {desde}–{hasta} de {total}", "Filas por página"; "Anterior", "Siguiente",
 * "Página {n} de {m}" y el nombre "Paginación", aprobados en el spec v1.5). Spec de rediseño, 4.17: apilada bajo `sm`,
 * donde "Anterior"/"Siguiente" muestran solo el ícono (el texto sigue siendo su nombre accesible).
 */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const sizeId = useId();
  const pages = pageCount(total, pageSize);
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación"
      className="mt-4 flex flex-col gap-3 text-sm text-fg sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-fg-muted tabular-nums">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor={sizeId} className="text-fg-muted">
            Filas por página
          </label>
          <div className="relative">
            <select
              id={sizeId}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className={cx(INPUT_COMPACT_CLASSES, "appearance-none pr-8 tabular-nums")}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <span className="max-sm:sr-only">Anterior</span>
          </Button>
          <span className="whitespace-nowrap tabular-nums">
            Página {page} de {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            <span className="max-sm:sr-only">Siguiente</span>
            <ChevronRight className="size-4 shrink-0" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
