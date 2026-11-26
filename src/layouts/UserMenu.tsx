import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { useLogout } from "../auth/useLogout";
import { Avatar } from "../components/Avatar";
import type { Me } from "../lib/api";
import { cx } from "../lib/cx";

const ITEM_CLASSES = cx(
  "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-fg pointer-coarse:h-11",
  "transition-colors duration-150 ease-out hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50",
  "motion-reduce:transition-none",
);

/**
 * Menú de usuario (sección 8.5; spec de rediseño 5.3): avatar, nombre y rol; Mi perfil, Cambiar contraseña y Cerrar
 * sesión. Es un botón que despliega una lista (patrón disclosure): se cierra con Escape, al hacer clic fuera o al elegir
 * una opción. Bajo `sm`, el nombre y el rol del disparador quedan solo para lectores de pantalla (siguen en su nombre
 * accesible) y se ven en el encabezado del panel.
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
  const name = `${me.firstNames} ${me.lastNames}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          "group flex h-10 max-w-56 items-center gap-2 rounded-lg px-1.5 text-left sm:max-w-72 sm:px-2 pointer-coarse:h-11",
          "transition-colors duration-150 ease-out hover:bg-surface-muted aria-expanded:bg-surface-muted",
          "motion-reduce:transition-none",
        )}
      >
        <Avatar person={me} />
        <span className="flex min-w-0 flex-col max-sm:sr-only">
          <span className="truncate text-sm font-medium text-fg">{name}</span>
          <span className="truncate text-xs text-fg-muted">{me.role.name}</span>
        </span>
        {/*
          Gira con `aria-expanded` del disparador (variante `group-aria-expanded:`, 3.6). Bajo `sm` no se muestra (v1.3):
          el avatar solo deja sitio al botón de tema y al nombre del producto en la cabecera.
        */}
        <ChevronDown
          className={cx(
            "size-4 shrink-0 text-fg-muted transition-transform duration-200 ease-out group-aria-expanded:rotate-180 max-sm:hidden",
            "motion-reduce:transition-none motion-reduce:transform-none",
          )}
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cx(
          "absolute right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-surface-raised p-1",
          "shadow-popover dark:shadow-popover-dark",
          "transition duration-200 ease-out transition-discrete starting:-translate-y-1 starting:opacity-0",
          "motion-reduce:transition-none motion-reduce:transform-none",
        )}
      >
        {/* Encabezado no interactivo: datos del usuario (no es texto nuevo). */}
        <div className="flex flex-col px-2.5 py-2">
          <span className="truncate text-sm font-medium text-fg">{name}</span>
          <span className="truncate text-xs text-fg-muted">{me.role.name}</span>
        </div>
        <div aria-hidden="true" className="my-1 h-px bg-border" />
        <ul className="flex flex-col gap-0.5">
          <li>
            <Link to="/perfil" onClick={close} className={ITEM_CLASSES}>
              <UserRound className="size-4 shrink-0 text-fg-muted" />
              Mi perfil
            </Link>
          </li>
          <li>
            <Link to="/cambiar-contrasena" onClick={close} className={ITEM_CLASSES}>
              <KeyRound className="size-4 shrink-0 text-fg-muted" />
              Cambiar contraseña
            </Link>
          </li>
        </ul>
        <div aria-hidden="true" className="my-1 h-px bg-border" />
        <ul>
          <li>
            <button
              type="button"
              disabled={logout.isPending}
              aria-busy={logout.isPending || undefined}
              onClick={() => logout.mutate()}
              className={ITEM_CLASSES}
            >
              <LogOut className="size-4 shrink-0 text-fg-muted" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
