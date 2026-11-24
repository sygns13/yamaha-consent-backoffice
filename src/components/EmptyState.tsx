import { SearchX } from "lucide-react";

/** Lista sin resultados (Anexo A.1). */
export const EMPTY_LIST_MESSAGE = "No hay resultados para los filtros aplicados.";

/** Estado vacío (spec de rediseño, 4.11): ícono decorativo y el mensaje. */
export function EmptyState({ message = EMPTY_LIST_MESSAGE }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-4 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-fg-subtle">
        <SearchX className="size-6" />
      </span>
      <p className="text-sm text-fg-muted">{message}</p>
    </div>
  );
}
