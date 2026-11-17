import type { ReactNode } from "react";
import { Outlet } from "react-router";

/** Pantallas públicas (sección 8.5): fondo `surface`, tarjeta blanca centrada, "YAMAHA" y el nombre del producto. */
export function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface px-4 py-8 sm:py-16">
      <header className="mx-auto mb-6 max-w-md text-center">
        <p className="text-2xl font-bold tracking-[0.3em] text-brand">YAMAHA</p>
        <p className="mt-1 text-sm text-slate-700">BackOffice · Consentimientos</p>
      </header>
      <main className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm sm:p-8">{children ?? <Outlet />}</main>
    </div>
  );
}
