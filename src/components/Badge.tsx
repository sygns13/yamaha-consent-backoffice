import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type BadgeVariant = "success" | "neutral" | "warning";

// Contraste AA: success y warning sobre su fondo (tests/theme-contrast.test.ts); neutral, slate-700 sobre slate-100.
const VARIANTS: Record<BadgeVariant, string> = {
  success: "border-success bg-success-surface text-success",
  neutral: "border-slate-400 bg-slate-100 text-slate-700",
  warning: "border-warning bg-warning-surface text-warning",
};

/** Distintivo de estado (p. ej. Activo verde, Inactivo gris, Bloqueado ámbar; sección 8.6). */
export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span className={cx("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", VARIANTS[variant])}>
      {children}
    </span>
  );
}
