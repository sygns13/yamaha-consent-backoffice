/** Lista sin resultados (Anexo A.1). */
export const EMPTY_LIST_MESSAGE = "No hay resultados para los filtros aplicados.";

export function EmptyState({ message = EMPTY_LIST_MESSAGE }: { message?: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-700">{message}</p>;
}
