import type { ReactNode } from "react";

export interface DetailItem {
  label: string;
  value: ReactNode;
}

/** Datos de un registro (detalle de usuario o dealer, Mi perfil) como lista de definiciones. */
export function DetailList({ items }: { items: readonly DetailItem[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-sm font-medium text-slate-600">{item.label}</dt>
          <dd className="mt-1 break-words text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
