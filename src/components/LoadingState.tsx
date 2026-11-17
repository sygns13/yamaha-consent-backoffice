import { Spinner } from "./Spinner";

/** "Cargando..." (Anexo A.1) en una región `status`. */
export function LoadingState() {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-8 text-sm text-slate-700">
      <Spinner />
      Cargando...
    </div>
  );
}
