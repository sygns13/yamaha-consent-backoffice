import { useEffect, useId, useRef, type ReactNode } from "react";

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
}

/**
 * Diálogo modal con `<dialog>` nativo y `showModal()` (sección 8.1): atrapa el foco y, al cerrarse, lo devuelve al
 * elemento que lo tenía (sección 8.7). El contenido solo existe mientras está abierto (la contraseña temporal no
 * queda en el DOM). El estado `open` manda: si el navegador lo cierra por su cuenta, se avisa o se vuelve a abrir.
 */
export function Modal({ open, title, description, onDismiss, children, actions }: ModalProps) {
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
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="text-sm text-slate-800">
              {description}
            </div>
          )}
          {children}
          <div className="flex flex-wrap justify-end gap-2">{actions}</div>
        </div>
      )}
    </dialog>
  );
}

function restoreFocus(element: HTMLElement | null): void {
  if (element?.isConnected) element.focus();
}
