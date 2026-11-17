import { useId, type ComponentProps } from "react";
import { FieldShell } from "./FieldShell";
import { fieldDescriptionIds } from "./fieldIds";
import { INPUT_CLASSES } from "./styles";

export interface TextFieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: string;
  error?: string;
  /** Asterisco visual de campo obligatorio (la leyenda "* Campo obligatorio" va en el formulario). */
  requiredMark?: boolean;
  /** Ids de otros elementos que describen el campo (p. ej. el checklist de la política). */
  describedBy?: string;
}

/** Campo de texto con `<label>`, `aria-invalid` y `aria-describedby` (sección 8.7). El `ref` llega en `props`. */
export function TextField({ label, hint, error, requiredMark, describedBy, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ids = fieldDescriptionIds(inputId, { hint, error, describedBy });
  return (
    <FieldShell inputId={inputId} label={label} hint={hint} error={error} requiredMark={requiredMark}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={className ?? INPUT_CLASSES}
        {...props}
      />
    </FieldShell>
  );
}
