import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { isKnownModule, MODULES } from "../app/modules";
import { useLogout } from "../auth/useLogout";
import { useMe } from "../auth/useMe";
import { BrandLogo } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { EnvironmentBadge } from "../components/EnvironmentBadge";
import { cx } from "../lib/cx";
import { UserMenu } from "./UserMenu";

const NAV_ID = "menu-principal";

/**
 * Pantallas con sesión (sección 8.5): cabecera con el logo (spec de rediseño 3.8), el producto, `EnvironmentBadge` y
 * el menú de usuario; menú lateral con Inicio y los módulos de `me.modules`. Bajo 1024 px el menú lateral es un panel desplegable.
 * Con `mustChangePassword` (cambio obligatorio, sección 8.6) no hay menú lateral ni menú de usuario: solo
 * "Cerrar sesión".
 */
export function AppLayout() {
  const me = useMe();
  const restricted = me.mustChangePassword;
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          {!restricted && (
            <button
              type="button"
              aria-expanded={navOpen}
              aria-controls={NAV_ID}
              onClick={() => setNavOpen((open) => !open)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-fg lg:hidden"
            >
              {navOpen ? <X className="size-5 shrink-0" /> : <Menu className="size-5 shrink-0" />}
              Menú
            </button>
          )}
          <div className="flex items-center gap-3">
            <BrandLogo className="h-8" />
            <span className="text-xs text-fg-muted">BackOffice · Consentimientos</span>
          </div>
          <EnvironmentBadge />
          <div className="ml-auto">{restricted ? <LogoutButton /> : <UserMenu me={me} />}</div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {!restricted && (
          <nav
            id={NAV_ID}
            aria-label="Menú principal"
            className={cx(
              "border-b border-border bg-surface lg:block lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0",
              navOpen ? "block" : "hidden",
            )}
          >
            <ul className="flex flex-col gap-1 p-3">
              <li>
                <MenuLink to="/" end onNavigate={closeNav}>
                  Inicio
                </MenuLink>
              </li>
              {me.modules.map(({ code }) =>
                isKnownModule(code) ? (
                  <li key={code}>
                    <MenuLink to={MODULES[code].path} onNavigate={closeNav}>
                      {MODULES[code].menuLabel}
                    </MenuLink>
                  </li>
                ) : null,
              )}
            </ul>
          </nav>
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
  onNavigate,
  children,
}: {
  to: string;
  end?: boolean;
  onNavigate: () => void;
  children: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          "flex min-h-11 items-center rounded-md px-3 text-sm font-medium",
          isActive ? "bg-primary text-on-primary" : "text-fg hover:bg-surface-muted",
        )
      }
    >
      {children}
    </NavLink>
  );
}

function LogoutButton() {
  const logout = useLogout();
  return (
    <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
      Cerrar sesión
    </Button>
  );
}
