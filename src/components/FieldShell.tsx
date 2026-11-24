import { CircleExclamationPoint } from "lucide-react";
import type { ReactNode } from "react";
import { fieldDescriptionIds } from "./fieldIds";

interface FieldShellProps {
  inputId: string;
  label: string;
  hint?: string;
  error?: string;
  requiredMark?: boolean;
  children: ReactNode;
}

/**
 * Etiqueta, ayuda y error de un campo. El `<label>` queda asociado al control por `htmlFor`; los ids de ayuda y error
 * (`aria-describedby`) no cambian. El ícono del error es decorativo (spec de rediseño, 3.6).
 */
export function FieldShell({ inputId, label, hint, error, requiredMark = false, children }: FieldShellProps) {
  const { hintId, errorId } = fieldDescriptionIds(inputId, { hint, error });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        {label}
        {requiredMark && (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleExclamationPoint className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
