import { CloudOff, RotateCw } from "lucide-react";
import { NETWORK_ERROR_MESSAGE } from "../lib/errors";
import { Alert } from "./Alert";
import { Button } from "./Button";

/**
 * Error de carga con "Reintentar" (sección 8.6). Por defecto, el mensaje de conexión del Anexo A.1. Presentación de la
 * spec de rediseño, 4.12: mismo contenedor que `EmptyState`, el `Alert` (rol `alert`) y el botón.
 */
export function ErrorState({ message = NETWORK_ERROR_MESSAGE, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-4 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-surface text-danger">
        <CloudOff className="size-6" />
      </span>
      <Alert variant="error" className="text-left">
        {message}
      </Alert>
      <Button variant="secondary" icon={RotateCw} onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
