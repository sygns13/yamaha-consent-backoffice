import { useId } from "react";
import { PAGE_SIZES, pageCount } from "../lib/listParams";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Paginación (Anexo A.1: "Mostrando {desde}–{hasta} de {total}", "Filas por página"; "Anterior", "Siguiente",
 * "Página {n} de {m}" y el nombre "Paginación", aprobados en el spec v1.5).
 */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const sizeId = useId();
  const pages = pageCount(total, pageSize);
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-slate-800">
      <p>
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor={sizeId}>Filas por página</label>
          <select
            id={sizeId}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-11 rounded-md border border-slate-400 bg-white px-2 text-base"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Anterior
          </Button>
          <span className="whitespace-nowrap">
            Página {page} de {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </nav>
  );
}
