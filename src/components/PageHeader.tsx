import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cx } from "../lib/cx";
import { actionClasses } from "./styles";

interface PageHeaderProps {
  title: string;
  /** Subtítulo bajo el título (spec de rediseño, P3; p. ej. la descripción del módulo). */
  description?: ReactNode;
  /** Junto al título, p. ej. el estado del usuario en su detalle. */
  badge?: ReactNode;
  actions?: ReactNode;
  /**
   * Enlace "Volver" sobre el título (spec de rediseño v1.3, 4.13): de las listas a Inicio y de los detalles a su lista.
   * Siempre a la ruta, sin depender del historial.
   */
  back?: { to: string; label: string };
}

/** Título de la página (único `<h1>`), subtítulo opcional y acciones a la derecha (en columna bajo `sm`). */
export function PageHeader({ title, description, badge, actions, back }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {back && (
        // Alineado con el título: el relleno horizontal del enlace queda fuera del borde del contenido.
        <Link to={back.to} className={cx(actionClasses(), "-ml-2.5 mb-2")}>
          <ArrowLeft className="size-4 shrink-0" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
