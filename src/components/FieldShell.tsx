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

/** Etiqueta, ayuda y error de un campo. El `<label>` queda asociado al control por `htmlFor`. */
export function FieldShell({ inputId, label, hint, error, requiredMark = false, children }: FieldShellProps) {
  const { hintId, errorId } = fieldDescriptionIds(inputId, { hint, error });
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-800">
        {label}
        {requiredMark && (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
