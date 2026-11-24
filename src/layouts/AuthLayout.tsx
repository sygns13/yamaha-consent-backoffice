import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { BrandLogo } from "../components/BrandLogo";

/** Pantallas públicas (sección 8.5; marca: spec de rediseño 3.8): fondo `canvas`, tarjeta centrada, logo y producto. */
export function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:py-16">
      <header className="mx-auto mb-6 flex max-w-md flex-col items-center text-center">
        <BrandLogo className="h-10" />
        <p className="mt-2 text-sm text-fg-muted">BackOffice · Consentimientos</p>
      </header>
      <main className="mx-auto max-w-md rounded-lg bg-surface p-6 shadow-sm sm:p-8">{children ?? <Outlet />}</main>
    </div>
  );
}
