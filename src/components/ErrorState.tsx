import { NETWORK_ERROR_MESSAGE } from "../lib/errors";
import { Alert } from "./Alert";
import { Button } from "./Button";

/** Error de carga con "Reintentar" (sección 8.6). Por defecto, el mensaje de conexión del Anexo A.1. */
export function ErrorState({ message = NETWORK_ERROR_MESSAGE, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 py-4">
      <Alert variant="error">{message}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
