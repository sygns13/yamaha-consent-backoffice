import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Subtítulo bajo el título (spec de rediseño, P3; p. ej. la descripción del módulo). */
  description?: ReactNode;
  /** Junto al título, p. ej. el estado del usuario en su detalle. */
  badge?: ReactNode;
  actions?: ReactNode;
}

/** Título de la página (único `<h1>`), subtítulo opcional y acciones a la derecha (en columna bajo `sm`). */
export function PageHeader({ title, description, badge, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
