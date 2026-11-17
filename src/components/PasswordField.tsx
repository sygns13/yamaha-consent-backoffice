import { useId, useState } from "react";
import { cx } from "../lib/cx";
import { FieldShell } from "./FieldShell";
import { fieldDescriptionIds } from "./fieldIds";
import { INPUT_CLASSES } from "./styles";
import type { TextFieldProps } from "./TextField";

/** Contraseña con botón mostrar/ocultar (Anexo A.2: "Mostrar contraseña" / "Ocultar contraseña"). */
export function PasswordField({ label, hint, error, requiredMark, describedBy, id, ...props }: Omit<TextFieldProps, "type">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const ids = fieldDescriptionIds(inputId, { hint, error, describedBy });
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell inputId={inputId} label={label} hint={hint} error={error} requiredMark={requiredMark}>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cx(INPUT_CLASSES, "pr-12")}
          {...props}
        />
        <button
          type="button"
          aria-controls={inputId}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-600 hover:text-brand"
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
    </FieldShell>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  );
}
