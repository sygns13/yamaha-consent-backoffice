/**
 * Distintivo de entorno (sección 8.5): el valor de `VITE_ENVIRONMENT_LABEL`; sin valor no se muestra. Pastilla con un
 * punto decorativo, sin animación (spec de rediseño, 4.19).
 */
export function EnvironmentBadge({ label = import.meta.env.VITE_ENVIRONMENT_LABEL }: { label?: string }) {
  const text = label?.trim();
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-surface px-2.5 py-0.5 text-xs font-semibold text-warning ring-1 ring-warning/30 ring-inset">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {text}
    </span>
  );
}
