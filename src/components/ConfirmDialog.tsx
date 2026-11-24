import { TriangleExclamationPoint } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Texto del botón que confirma: la etiqueta de la acción (Anexo A.2, p. ej. "Eliminar"). */
  confirmLabel: string;
  /** Rojo para las acciones destructivas (eliminar, desactivar, contraseña temporal). */
  destructive?: boolean;
  /** Mientras se ejecuta la acción: botones deshabilitados y Escape no cierra. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación (sección 8.1: en lugar de los diálogos nativos del navegador). El foco empieza en "Cancelar", la opción
 * segura. Textos: título y botón con la etiqueta de la acción, mensaje del Anexo A.2 (aprobado en el spec v1.5).
 * Las destructivas llevan un aviso decorativo junto al título (spec de rediseño, 4.7).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = true,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={<p>{message}</p>}
      onDismiss={pending ? undefined : onCancel}
      icon={
        destructive ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-surface text-danger">
            <TriangleExclamationPoint className="size-5" />
          </span>
        ) : undefined
      }
      actions={
        <>
          <Button variant="secondary" data-autofocus disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant={destructive ? "danger" : "primary"} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
