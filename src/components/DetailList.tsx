import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export interface DetailItem {
  label: string;
  value: ReactNode;
}

interface DetailListProps {
  items: readonly DetailItem[];
  /** 2: como máximo dos columnas (Mi perfil); por defecto, hasta tres desde `lg`. */
  columns?: 2 | 3;
}

/** Datos de un registro (detalle de usuario o dealer, Mi perfil) como lista de definiciones (spec de rediseño, 4.15). */
export function DetailList({ items, columns = 3 }: DetailListProps) {
  return (
    <dl className={cx("grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wider text-fg-muted uppercase">{item.label}</dt>
          <dd className="mt-1 text-sm break-words text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
