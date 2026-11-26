import type { ReactNode } from "react";
import { Outlet } from "react-router";
import emblem from "../assets/brand/yamaha-emblem.png";
import { BrandLogo } from "../components/BrandLogo";

/** GIF transparente de 1×1 (permitido por `img-src 'self' data:`, sección 8.8). */
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Pantallas públicas (sección 8.5; spec de rediseño 5.1). Franja de acento roja arriba (P5). Bajo `lg`: logo y producto
 * sobre una tarjeta centrada. Desde `lg` (P6): dos columnas a toda la altura, el panel de marca azul a la izquierda
 * (logo inverso, producto y el emblema como marca de agua) y la tarjeta a la derecha. Un solo `<header>` (en `lg` es el
 * panel) y un solo `<main>` (la tarjeta).
 */
export function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div aria-hidden="true" className="h-[3px] shrink-0 bg-accent" />
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
        {/*
          `forced-color-adjust-none` desde `lg` (U4.3): con colores forzados el panel perdía el azul y el logo inverso
          (texto blanco) desaparecía sobre el fondo del sistema. El texto `on-primary` sobre `brand-panel` es AA.
        */}
        <header className="relative flex flex-col items-center px-4 pt-8 text-center sm:pt-16 lg:justify-center lg:overflow-hidden lg:bg-brand-panel lg:p-12 lg:text-left lg:forced-color-adjust-none xl:p-16">
          <div className="flex flex-col items-center lg:relative lg:z-10 lg:items-start lg:gap-6">
            <BrandLogo className="h-10 lg:hidden" />
            <BrandLogo variant="inverse" className="hidden h-12 lg:block" />
            <p className="mt-2 text-sm text-fg-muted lg:mt-0 lg:font-display lg:text-2xl lg:font-semibold xl:text-3xl lg:tracking-tight lg:text-on-primary">
              BackOffice · Consentimientos
            </p>
          </div>
          {/*
            Solo desde `lg` (64rem) se pide el emblema (29 KB); abajo, un píxel transparente embebido. Un <img> con
            `display: none` igual se descarga.
          */}
          <picture>
            <source media="(min-width: 64rem)" srcSet={emblem} />
            <img
              src={TRANSPARENT_PIXEL}
              alt=""
              width={300}
              height={300}
              className="pointer-events-none absolute -right-24 -bottom-24 hidden size-[28rem] opacity-10 select-none lg:block"
            />
          </picture>
        </header>
        <main className="flex flex-1 justify-center px-4 pt-6 pb-8 sm:pb-16 lg:items-center lg:p-12">
          <div className="w-full max-w-md self-start rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8 lg:self-auto dark:shadow-none">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
