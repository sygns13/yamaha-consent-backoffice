import { House, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { isKnownModule, MODULES } from "../app/modules";
import { useLogout } from "../auth/useLogout";
import { useMe } from "../auth/useMe";
import { BrandLogo } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { EnvironmentBadge } from "../components/EnvironmentBadge";
import { cx } from "../lib/cx";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const NAV_ID = "menu-principal";

/**
 * Pantallas con sesión (sección 8.5; spec de rediseño 5.2): franja de acento (P5) y cabecera fija con el botón "Menú"
 * (bajo 1024 px), el logo, el producto, `EnvironmentBadge`, el botón de tema (v1.3) y el menú de usuario; debajo, el
 * menú lateral (Inicio y los módulos de `me.modules`) y el contenido. Bajo 1024 px el menú lateral es un panel
 * desplegable en el flujo. Con `mustChangePassword` (cambio obligatorio, sección 8.6) no hay menú lateral ni menú de
 * usuario: solo el botón de tema (desde `sm`) y "Cerrar sesión".
 */
export function AppLayout() {
  const me = useMe();
  const restricted = me.mustChangePassword;
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div aria-hidden="true" className="h-[3px] shrink-0 bg-accent" />
      {/* La transparencia es del fondo (con desenfoque), nunca del texto. */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="flex h-14 items-center gap-1.5 px-4 sm:gap-4 lg:px-6">
          {!restricted && (
            <button
              type="button"
              aria-expanded={navOpen}
              aria-controls={NAV_ID}
              onClick={() => setNavOpen((open) => !open)}
              className={cx(
                "-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-fg-muted lg:hidden",
                "transition duration-150 ease-out hover:bg-surface-muted hover:text-fg active:translate-y-px",
                "aria-expanded:bg-surface-muted aria-expanded:text-fg motion-reduce:transition-none motion-reduce:transform-none",
              )}
            >
              {navOpen ? <X className="size-5 shrink-0" /> : <Menu className="size-5 shrink-0" />}
              <span className="sr-only">Menú</span>
            </button>
          )}
          {/* Bajo `sm`, 28 px (v1.3): con el botón de tema, deja sitio al nombre del producto. */}
          <BrandLogo className="h-7 shrink-0 sm:h-8" />
          <span className="min-w-0 truncate text-xs font-medium text-fg-muted sm:text-sm">BackOffice · Consentimientos</span>
          <span className="shrink-0">
            <EnvironmentBadge />
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {/*
              En el cambio obligatorio, bajo `sm` no cabe junto a "Cerrar sesión" (con texto: es la única salida). Es un
              paso de una sola vez: el tema se cambia después, o desde `sm`.
            */}
            <ThemeToggle className={restricted ? "max-sm:hidden" : undefined} />
            {restricted ? <LogoutButton /> : <UserMenu me={me} />}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/*
          Desde `lg`, la columna (fondo y borde) ocupa todo el alto del contenido y el <nav> va fijo adentro, con scroll
          propio (5.2): así el fondo del menú no se corta en las páginas largas.
        */}
        {!restricted && (
          <div className="lg:w-64 lg:shrink-0 lg:border-r lg:border-border lg:bg-surface">
            <nav
              id={NAV_ID}
              aria-label="Menú principal"
              className={cx(
                // Bajo 1024 px: panel en el flujo con sombra y entrada animada (@starting-style). Desde `lg`: lateral fijo.
                "border-b border-border bg-surface max-lg:shadow-popover max-lg:dark:shadow-popover-dark",
                "max-lg:transition max-lg:duration-200 max-lg:ease-out max-lg:transition-discrete",
                "max-lg:starting:-translate-y-1 max-lg:starting:opacity-0 motion-reduce:transition-none motion-reduce:transform-none",
                "lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-b-0",
                navOpen ? "block" : "hidden",
              )}
            >
              <ul className="flex flex-col gap-0.5 p-3">
                <li>
                  <MenuLink to="/" end icon={House} onNavigate={closeNav}>
                    Inicio
                  </MenuLink>
                </li>
                {me.modules.map(({ code }) =>
                  isKnownModule(code) ? (
                    <li key={code}>
                      <MenuLink to={MODULES[code].path} icon={MODULES[code].icon} onNavigate={closeNav}>
                        {MODULES[code].menuLabel}
                      </MenuLink>
                    </li>
                  ) : null,
                )}
              </ul>
            </nav>
          </div>
        )}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MenuLink({
  to,
  end,
  icon: Icon,
  onNavigate,
  children,
}: {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  onNavigate: () => void;
  children: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      // Activo (`aria-current="page"`, lo pone NavLink): fondo `primary-subtle`, texto e ícono `primary-text` (3.6).
      className={({ isActive }) =>
        cx(
          "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium lg:h-9",
          "transition duration-150 ease-out motion-reduce:transition-none",
          // Con colores forzados el fondo se pierde: el activo se subraya (U4.3).
          isActive
            ? "bg-primary-subtle text-primary-text forced-colors:underline forced-colors:underline-offset-4"
            : "text-fg-muted hover:bg-surface-muted hover:text-fg",
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </NavLink>
  );
}

function LogoutButton() {
  const logout = useLogout();
  return (
    <Button variant="secondary" size="sm" icon={LogOut} loading={logout.isPending} onClick={() => logout.mutate()}>
      Cerrar sesión
    </Button>
  );
}
