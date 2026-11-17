/** Distintivo de entorno (sección 8.5): el valor de `VITE_ENVIRONMENT_LABEL`; sin valor no se muestra. */
export function EnvironmentBadge({ label = import.meta.env.VITE_ENVIRONMENT_LABEL }: { label?: string }) {
  const text = label?.trim();
  if (!text) return null;
  return (
    <span className="rounded border border-warning bg-warning-surface px-2 py-0.5 text-xs font-semibold text-warning">
      {text}
    </span>
  );
}
