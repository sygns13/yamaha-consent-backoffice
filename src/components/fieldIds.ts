/** Ids de las descripciones de un campo, para `aria-describedby` (sección 8.7). */
export function fieldDescriptionIds(inputId: string, options: { hint?: string; error?: string; describedBy?: string }) {
  const hintId = options.hint ? `${inputId}-hint` : undefined;
  const errorId = options.error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, options.describedBy, errorId].filter(Boolean).join(" ") || undefined;
  return { hintId, errorId, describedBy };
}
