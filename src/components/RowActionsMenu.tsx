import { Ellipsis, type LucideIcon } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { cx } from "../lib/cx";
import { RecordName } from "./RecordName";

export interface RowAction {
  key: string;
  /** Etiqueta visible (Anexo A.2); el nombre accesible le suma el registro ("Desactivar jperez"). */
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** `danger`: al final, tras un divisor, en rojo. */
  tone?: "default" | "danger";
}

interface RowActionsMenuProps {
  /** Registro de la fila (sufijo `sr-only`, Anexo A.1): "jperez", "CL0001". */
  name: string;
  items: readonly RowAction[];
  /** Acción en curso para esa fila: el disparador queda deshabilitado. */
  disabled?: boolean;
}

/**
 * "Más acciones" de una fila (spec de rediseño, 4.23, D4). Panel con `popover="auto"` (Popover API): está en la *top
 * layer*, así el `overflow` de la tabla no lo recorta, y Escape o el clic afuera lo cierran (nativo). Es una lista de
 * botones (patrón *disclosure*, como el menú de usuario), no `role="menu"`: se recorre con Tab. La posición es solo CSS
 * (`.row-actions-panel` en `global.css`): anclado al botón donde hay *anchor positioning*, hoja inferior si no o bajo
 * `sm`. Solo puede haber un popover `auto` abierto, así que el nombre del ancla se pone solo mientras está abierto.
 */
export function RowActionsMenu({ name, items, disabled = false }: RowActionsMenuProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  // `toggle` se enlaza a mano: react.dev documenta `onToggle` solo para <details> (verificado en U2).
  const attachPanel = useCallback((panel: HTMLDivElement | null) => {
    panelRef.current = panel;
    if (panel === null) return;
    const onToggle = (event: Event) => {
      const opened = (event as ToggleEvent).newState === "open";
      setOpen(opened);
      if (opened) {
        panel.querySelector<HTMLButtonElement>("button")?.focus();
        return;
      }
      // Escape ya devuelve el foco al disparador (nativo); si quedó en el panel cerrado o en <body>, se devuelve aquí.
      const active = document.activeElement;
      if (active === null || active === document.body || panel.contains(active)) triggerRef.current?.focus();
    };
    panel.addEventListener("toggle", onToggle);
    return () => {
      panel.removeEventListener("toggle", onToggle);
      panelRef.current = null;
    };
  }, []);

  if (items.length === 0) return null;

  const select = (item: RowAction) => {
    // Primero el foco al disparador y luego cerrar: si la acción abre un ConfirmDialog, el foco vuelve aquí al cerrarlo.
    triggerRef.current?.focus();
    panelRef.current?.hidePopover();
    item.onSelect();
  };
  const regular = items.filter((item) => item.tone !== "danger");
  const destructive = items.filter((item) => item.tone === "danger");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={panelId}
        aria-expanded={open}
        disabled={disabled}
        className={cx(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-fg-muted",
          "transition duration-150 ease-out active:translate-y-px not-disabled:hover:bg-surface-muted not-disabled:hover:text-fg",
          "aria-expanded:bg-surface-muted aria-expanded:text-fg disabled:cursor-not-allowed disabled:opacity-50",
          "motion-reduce:transition-none motion-reduce:transform-none",
          open && "[anchor-name:--row-actions]",
        )}
      >
        <Ellipsis className="size-4" />
        <span className="sr-only">Más acciones</span>
        <RecordName name={name} />
      </button>
      <div
        ref={attachPanel}
        id={panelId}
        popover="auto"
        className={cx(
          "row-actions-panel min-w-48 rounded-xl border border-border bg-surface-raised p-1 text-fg",
          "shadow-popover dark:shadow-popover-dark",
          "transition duration-200 ease-out transition-discrete starting:open:translate-y-1 starting:open:opacity-0",
          "motion-reduce:transition-none motion-reduce:transform-none",
        )}
      >
        {regular.length > 0 && <ActionList name={name} items={regular} onSelect={select} />}
        {regular.length > 0 && destructive.length > 0 && <div aria-hidden="true" className="my-1 h-px bg-border" />}
        {destructive.length > 0 && <ActionList name={name} items={destructive} onSelect={select} />}
      </div>
    </>
  );
}

function ActionList({
  name,
  items,
  onSelect,
}: {
  name: string;
  items: readonly RowAction[];
  onSelect: (item: RowAction) => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className={cx(
              "flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium whitespace-nowrap max-sm:h-11",
              "transition-colors duration-150 ease-out motion-reduce:transition-none",
              item.tone === "danger" ? "text-danger hover:bg-danger-surface" : "text-fg hover:bg-surface-muted",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
            <RecordName name={name} />
          </button>
        </li>
      ))}
    </ul>
  );
}
