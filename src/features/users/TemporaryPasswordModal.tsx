import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";

interface TemporaryPasswordModalProps {
  open: boolean;
  username: string;
  password: string;
  /** "Entendido": la única forma de cerrarlo (sección 8.6). */
  onClose: () => void;
}

/**
 * Contraseña temporal (sección 8.6, textos del Anexo A.2): se muestra una sola vez, con "Copiar"
 * (`navigator.clipboard`), y solo se cierra con "Entendido". Al cerrarse, la contraseña sale del DOM.
 */
export function TemporaryPasswordModal({ open, username, password, onClose }: TemporaryPasswordModalProps) {
  // Se guarda qué contraseña se copió: una contraseña nueva vuelve a mostrar "Copiar".
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);
  const copied = copiedPassword === password;

  const copy = () => {
    // Sin portapapeles (contexto no seguro) o con el permiso denegado, el texto sigue visible y seleccionable.
    navigator.clipboard?.writeText(password).then(
      () => setCopiedPassword(password),
      () => undefined,
    );
  };

  return (
    <Modal
      open={open}
      title="Contraseña temporal"
      actions={
        <Button data-autofocus onClick={onClose}>
          Entendido
        </Button>
      }
    >
      <p className="text-sm text-fg">Usuario: {username}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 rounded-lg border border-border bg-surface-muted px-3 py-2 font-mono text-lg tracking-wide break-all text-fg select-all">
          {password}
        </code>
        <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <Alert variant="warning" live={false}>
        Esta contraseña se muestra una sola vez. Entrégala al usuario por un canal seguro; deberá cambiarla al iniciar
        sesión.
      </Alert>
    </Modal>
  );
}
