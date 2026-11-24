import { CircleCheck, CircleExclamationPoint, TriangleExclamationPoint, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type AlertVariant = "error" | "success" | "warning";

// Spec de rediseño, 4.4: la variante no depende solo del color (el ícono cambia de forma).
const VARIANTS: Record<AlertVariant, { classes: string; icon: LucideIcon }> = {
  error: { classes: "border-danger/30 bg-danger-surface text-danger", icon: CircleExclamationPoint },
  success: { classes: "border-success/30 bg-success-surface text-success", icon: CircleCheck },
  warning: { classes: "border-warning/30 bg-warning-surface text-warning", icon: TriangleExclamationPoint },
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
  const { classes, icon: Icon } = VARIANTS[variant];
  const box =
    children === undefined || children === null || children === false ? null : (
      <div className={cx("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", classes, className)}>
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  if (live === false) return box;
  return <div role={live === "assertive" ? "alert" : "status"}>{box}</div>;
}
