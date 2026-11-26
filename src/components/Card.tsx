import { useId, type ReactNode } from "react";
import { cx } from "../lib/cx";

interface CardProps {
  /** `section` cuando la tarjeta es una región con su propio título. */
  as?: "div" | "section";
  /** Título (`h2`) del encabezado. */
  title?: string;
  /** Acciones a la derecha del encabezado. */
  actions?: ReactNode;
  /** Pie (p. ej. las acciones de un formulario), separado por un borde. */
  footer?: ReactNode;
  /** `md` (por defecto) = `p-5 sm:p-6`; `sm` = `p-4` (barra de filtros). */
  padding?: "sm" | "md";
  className?: string;
  children?: ReactNode;
}

/**
 * Tarjeta (spec de rediseño, 4.14): borde sutil, sombra suave en claro y solo borde en oscuro. Un solo nivel de tarjeta
 * por pantalla (3.1).
 */
export function Card({ as: Tag = "div", title, actions, footer, padding = "md", className, children }: CardProps) {
  const titleId = useId();
  const hasHeader = title !== undefined || actions !== undefined;
  const bodyPadding = padding === "sm" ? "p-4" : "p-5 sm:p-6";
  return (
    <Tag
      aria-labelledby={Tag === "section" && title !== undefined ? titleId : undefined}
      className={cx("rounded-xl border border-border bg-surface shadow-card dark:shadow-none", className)}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          {title !== undefined && (
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-fg">
              {title}
            </h2>
          )}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={bodyPadding}>{children}</div>}
      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</div>
      )}
    </Tag>
  );
}

/**
 * Secciones de un formulario dentro de una tarjeta (spec de rediseño, 6.4 y P2): cada una con su `h2` y una grilla de
 * dos columnas desde `sm`, separadas por un borde. Va dentro de `CardSections`.
 */
export function CardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 py-6 first:pt-0 last:pb-0">
      <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** Contenedor de `CardSection`: el borde va entre secciones (`divide-y`), no antes de la primera. */
export function CardSections({ children }: { children: ReactNode }) {
  return <div className="flex flex-col divide-y divide-border">{children}</div>;
}
