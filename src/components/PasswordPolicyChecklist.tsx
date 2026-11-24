import { Check, Circle, Minus } from "lucide-react";
import type { PasswordPolicy } from "../lib/api";
import { cx } from "../lib/cx";
import { checklistItems, type ChecklistState } from "../lib/validators/password";

interface PasswordPolicyChecklistProps {
  /** Para el `aria-describedby` del campo de la nueva contraseña. */
  id: string;
  policy: PasswordPolicy;
  password: string;
  /** Sin datos del usuario (Restablecer), el ítem de usuario/DNI queda neutral: lo valida el servidor (D2). */
  personalData?: { username: string; dni: string };
}

// Estado para lectores de pantalla (propuesta aprobada en la sesión 4; el Anexo A no lo define).
const SR_STATE: Record<ChecklistState, string | null> = {
  met: " (cumplido)",
  unmet: " (pendiente)",
  unknown: null,
};

/** Requisitos de la política en vivo (Anexo A.2), armados con `GET /auth/password-policy`. */
export function PasswordPolicyChecklist({ id, policy, password, personalData }: PasswordPolicyChecklistProps) {
  return (
    <ul id={id} className="flex flex-col gap-1.5 text-sm">
      {checklistItems(password, policy, personalData).map((item) => (
        <li
          key={item.key}
          data-state={item.state}
          className={cx(
            "flex items-start gap-2 transition-colors duration-150 motion-reduce:transition-none",
            item.state === "met" ? "text-success" : "text-fg-muted",
          )}
        >
          <StateIcon state={item.state} />
          <span>
            {item.label}
            {SR_STATE[item.state] && <span className="sr-only">{SR_STATE[item.state]}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Ícono decorativo en un círculo (spec de rediseño, 4.18): cumplido, pendiente o neutral. */
function StateIcon({ state }: { state: ChecklistState }) {
  return (
    <span
      className={cx(
        "grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
        state === "met" ? "bg-success-surface text-success" : "text-fg-subtle",
      )}
    >
      {state === "met" && <Check className="size-3.5" />}
      {state === "unmet" && <Circle className="size-3.5" />}
      {state === "unknown" && <Minus className="size-3.5" />}
    </span>
  );
}
