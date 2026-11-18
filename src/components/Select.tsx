import { useId, type ComponentProps } from "react";
import { FieldShell } from "./FieldShell";
import { fieldDescriptionIds } from "./fieldIds";
import { INPUT_CLASSES } from "./styles";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<ComponentProps<"select">, "children"> {
  label: string;
  options: readonly SelectOption[];
  /** Primera opción con valor vacío: "Todos" en los filtros, "Selecciona" en los formularios (Anexo A). */
  placeholder?: string;
  hint?: string;
  error?: string;
  requiredMark?: boolean;
}

/** Lista desplegable con `<label>`, `aria-invalid` y `aria-describedby` (sección 8.7). El `ref` llega en `props`. */
export function Select({ label, options, placeholder, hint, error, requiredMark, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const ids = fieldDescriptionIds(selectId, { hint, error });
  return (
    <FieldShell inputId={selectId} label={label} hint={hint} error={error} requiredMark={requiredMark}>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={INPUT_CLASSES}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
