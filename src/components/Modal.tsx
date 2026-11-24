import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "../lib/cx";

interface ModalProps {
  open: boolean;
  title: string;
  /** Texto que describe el diálogo (`aria-describedby`). */
  description?: ReactNode;
  /**
   * Escape cierra el diálogo llamando a esta función. Sin ella, el diálogo solo se cierra desde sus botones (p. ej. la
   * contraseña temporal: "solo se cierra con 'Entendido'", sección 8.6).
   */
  onDismiss?: () => void;
  children?: ReactNode;
  /** Botones al pie. El que lleve `data-autofocus` recibe el foco al abrir. */
  actions: ReactNode;
  /** Ícono decorativo junto al título (p. ej. el aviso de una confirmación destructiva). */
  icon?: ReactNode;
}

/**
 * Diálogo modal con `<dialog>` nativo y `showModal()` (sección 8.1): atrapa el foco y, al cerrarse, lo devuelve al
 * elemento que lo tenía (sección 8.7). El contenido solo existe mientras está abierto (la contraseña temporal no
 * queda en el DOM). El estado `open` manda: si el navegador lo cierra por su cuenta, se avisa o se vuelve a abrir.
 */
export function Modal({ open, title, description, onDismiss, children, actions, icon }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  const dismissRef = useRef(onDismiss);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    openRef.current = open;
    if (dialog === null) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // Sin onDismiss, Escape tampoco lo cierra en los navegadores que soportan `closedby`.
      if (dismissRef.current === undefined) dialog.setAttribute("closedby", "none");
      else dialog.removeAttribute("closedby");
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      restoreFocus(returnFocusRef.current);
    }
  }, [open]);

  // Si el componente se desmonta abierto (p. ej. al navegar), el foco vuelve igual.
  useEffect(() => () => restoreFocus(returnFocusRef.current), []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        // Escape: el estado lo decide quien abrió el diálogo.
        event.preventDefault();
        dismissRef.current?.();
      }}
      onClose={() => {
        // El navegador puede cerrarlo sin "cancel" (p. ej. Escape dos veces): se respeta el estado `open`.
        if (!openRef.current) return;
        if (dismissRef.current) dismissRef.current();
        else dialogRef.current?.showModal();
      }}
      // Spec de rediseño, 4.7: entrada con opacidad y escala (@starting-style), sin JavaScript de animación.
      className={cx(
        "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-surface-raised p-0 text-fg",
        "shadow-dialog dark:shadow-dialog-dark backdrop:bg-overlay/60 backdrop:backdrop-blur-[2px]",
        "transition duration-200 ease-out transition-discrete starting:open:scale-95 starting:open:opacity-0",
        "motion-reduce:transition-none motion-reduce:transform-none",
      )}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3">
            {icon}
            <h2 id={titleId} className={cx("min-w-0 text-lg font-semibold tracking-tight text-fg", icon !== undefined && "pt-1.5")}>
              {title}
            </h2>
          </div>
          {description && (
            <div id={descriptionId} className="text-sm text-fg-muted">
              {description}
            </div>
          )}
          {children}
          {/* El orden del DOM no cambia ("Cancelar" primero): en móvil, apilados a todo el ancho. */}
          <div className="flex flex-col gap-2 pt-2 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">{actions}</div>
        </div>
      )}
    </dialog>
  );
}

function restoreFocus(element: HTMLElement | null): void {
  if (element?.isConnected) element.focus();
}
