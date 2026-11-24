import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { useLogout } from "../auth/useLogout";
import type { Me } from "../lib/api";

const ITEM_CLASSES =
  "flex min-h-11 w-full items-center px-4 text-left text-sm text-fg hover:bg-surface-muted disabled:opacity-60";

/**
 * Menú de usuario (sección 8.5): nombre y rol; Mi perfil, Cambiar contraseña y Cerrar sesión. Es un botón que
 * despliega una lista (patrón disclosure): se cierra con Escape, al hacer clic fuera o al elegir una opción.
 */
export function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 max-w-48 items-center gap-2 rounded-md px-2 text-left hover:bg-surface-muted sm:max-w-72"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-fg">
            {me.firstNames} {me.lastNames}
          </span>
          <span className="truncate text-xs text-fg-muted">{me.role.name}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-fg-muted" />
      </button>
      <ul
        id={panelId}
        hidden={!open}
        className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-border bg-surface py-1 shadow-lg"
      >
        <li>
          <Link to="/perfil" onClick={close} className={ITEM_CLASSES}>
            Mi perfil
          </Link>
        </li>
        <li>
          <Link to="/cambiar-contrasena" onClick={close} className={ITEM_CLASSES}>
            Cambiar contraseña
          </Link>
        </li>
        <li>
          <button
            type="button"
            disabled={logout.isPending}
            aria-busy={logout.isPending || undefined}
            onClick={() => logout.mutate()}
            className={ITEM_CLASSES}
          >
            Cerrar sesión
          </button>
        </li>
      </ul>
    </div>
  );
}
