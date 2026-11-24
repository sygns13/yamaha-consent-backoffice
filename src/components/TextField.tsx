import type { LucideIcon } from "lucide-react";
import { useId, type ComponentProps } from "react";
import { cx } from "../lib/cx";
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
  /** Ícono decorativo dentro del campo, a la izquierda (p. ej. `Search` en la búsqueda). */
  icon?: LucideIcon;
}

/** Campo de texto con `<label>`, `aria-invalid` y `aria-describedby` (sección 8.7). El `ref` llega en `props`. */
export function TextField({ label, hint, error, requiredMark, describedBy, icon: Icon, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ids = fieldDescriptionIds(inputId, { hint, error, describedBy });
  const input = (
    <input
      id={inputId}
      aria-invalid={error ? true : undefined}
      aria-describedby={ids.describedBy}
      className={className ?? cx(INPUT_CLASSES, Icon && "pl-9")}
      {...props}
    />
  );
  return (
    <FieldShell inputId={inputId} label={label} hint={hint} error={error} requiredMark={requiredMark}>
      {Icon ? (
        <div className="relative">
          <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          {input}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}
