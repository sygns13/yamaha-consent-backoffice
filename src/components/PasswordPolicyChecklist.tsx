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
    <ul id={id} className="flex flex-col gap-1 text-sm">
      {checklistItems(password, policy, personalData).map((item) => (
        <li
          key={item.key}
          data-state={item.state}
          className={cx("flex items-start gap-2", item.state === "met" ? "text-success" : "text-slate-700")}
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

function StateIcon({ state }: { state: ChecklistState }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      {state === "met" && <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />}
      {state === "unmet" && <circle cx="10" cy="10" r="6" />}
      {state === "unknown" && <path d="M5 10h10" strokeLinecap="round" />}
    </svg>
  );
}
