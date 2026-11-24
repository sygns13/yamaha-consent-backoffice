import { Eye, EyeOff } from "lucide-react";
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
          className={cx(INPUT_CLASSES, "pr-11")}
          {...props}
        />
        <button
          type="button"
          aria-controls={inputId}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setVisible((value) => !value)}
          className={cx(
            "absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted",
            "transition duration-150 ease-out hover:bg-surface-muted hover:text-fg motion-reduce:transition-none",
          )}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
}
