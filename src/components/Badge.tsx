import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type BadgeVariant = "success" | "neutral" | "warning";

// Spec de rediseño, 4.5. Contraste AA en ambos temas: texto sobre su fondo (tests/theme-contrast.test.ts).
const VARIANTS: Record<BadgeVariant, string> = {
  success: "bg-success-surface text-success ring-success/30",
  neutral: "bg-surface-muted text-fg-muted ring-border",
  warning: "bg-warning-surface text-warning ring-warning/30",
};

/** Distintivo de estado (p. ej. Activo verde, Inactivo gris, Bloqueado ámbar; sección 8.6), con un punto decorativo. */
export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        VARIANTS[variant],
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}
