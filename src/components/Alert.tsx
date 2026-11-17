import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type AlertVariant = "error" | "success" | "warning";

const VARIANTS: Record<AlertVariant, string> = {
  error: "border-danger bg-danger-surface text-danger",
  success: "border-success bg-success-surface text-success",
  warning: "border-warning bg-warning-surface text-warning",
};

interface AlertProps {
  variant: AlertVariant;
  /** Sin contenido no se ve nada, pero la región viva sigue montada. */
  children?: ReactNode;
  /**
   * Región viva (sección 8.7). `assertive` (por defecto) → `role="alert"`; `polite` → `role="status"`; `false` →
   * aviso fijo, sin anunciar. La región envuelve siempre al cuadro, como en la landing: los lectores de pantalla
   * no anuncian bien una región que aparece junto con su texto. Para volver a anunciar el mismo texto, vaciarlo antes.
   */
  live?: "assertive" | "polite" | false;
  className?: string;
}

export function Alert({ variant, children, live = "assertive", className }: AlertProps) {
  const box =
    children === undefined || children === null || children === false ? null : (
      <div className={cx("rounded-md border-l-4 px-4 py-3 text-sm", VARIANTS[variant], className)}>{children}</div>
    );
  if (live === false) return box;
  return <div role={live === "assertive" ? "alert" : "status"}>{box}</div>;
}
