/**
 * Política de contraseñas en el cliente (sección 5.1), espejo de `app/core/passwords.py`. El servidor es la única
 * validación que manda: aquí solo se adelanta el mismo mensaje del 422 `PASSWORD_POLICY` (Anexo A.3) y se arma el
 * checklist en vivo (Anexo A.2). Los valores de la política salen de `GET /auth/password-policy`.
 */
import type { PasswordPolicy } from "../api";

const POLICY_ERROR_PREFIX = "La contraseña no cumple los requisitos: ";

// Mismas clases que la API (sección 5.1): Lu, Ll, 0-9 y "ni letra, ni número, ni espacio".
const UPPERCASE = /\p{Lu}/u;
const LOWERCASE = /\p{Ll}/u;
const DIGIT = /[0-9]/;
const SPECIAL = /[^\p{L}\p{N}\s]/u;
const EDGE_SPACES = /^\s|\s$/;

/** Datos del usuario que la contraseña no puede contener, y la actual (solo al cambiarla). */
export interface PasswordContext {
  username?: string;
  dni?: string;
  currentPassword?: string;
}

/** Largo en caracteres, como `len()` de Python (puntos de código, no unidades UTF-16). */
function length(password: string): number {
  return [...password].length;
}

function containsPersonalData(password: string, username: string, dni: string): boolean {
  const folded = password.toLowerCase();
  return [username, dni].some((value) => value !== "" && folded.includes(value.toLowerCase()));
}

/** Requisitos incumplidos, con los textos y en el orden del Anexo A.3. Lista vacía = cumple. */
export function passwordViolations(password: string, policy: PasswordPolicy, context: PasswordContext = {}): string[] {
  const violations: string[] = [];
  if (length(password) < policy.minLength) violations.push(`al menos ${policy.minLength} caracteres`);
  if (length(password) > policy.maxLength) violations.push(`como máximo ${policy.maxLength} caracteres`);
  if (policy.requireUppercase && !UPPERCASE.test(password)) violations.push("una letra mayúscula");
  if (policy.requireLowercase && !LOWERCASE.test(password)) violations.push("una letra minúscula");
  if (policy.requireDigit && !DIGIT.test(password)) violations.push("un número");
  if (policy.requireSpecial && !SPECIAL.test(password)) violations.push("un carácter especial (por ejemplo ! @ # $ %)");
  if (EDGE_SPACES.test(password)) violations.push("sin espacios al inicio ni al final");
  if (containsPersonalData(password, context.username ?? "", context.dni ?? "")) {
    violations.push("no debe contener tu usuario ni tu DNI");
  }
  if (context.currentPassword !== undefined && context.currentPassword !== "" && password === context.currentPassword) {
    violations.push("distinta de la contraseña actual");
  }
  return violations;
}

/** "La contraseña no cumple los requisitos: al menos 8 caracteres, un número." (Anexo A.3). */
export function policyErrorDetail(violations: string[]): string {
  return `${POLICY_ERROR_PREFIX}${violations.join(", ")}.`;
}

/** `unknown`: no se puede comprobar en el navegador (usuario y DNI en Restablecer; decisión D2). */
export type ChecklistState = "met" | "unmet" | "unknown";

export interface ChecklistItem {
  key: string;
  label: string;
  state: ChecklistState;
}

/**
 * Ítems del checklist (Anexo A.2). Sin `username` ni `dni` (Restablecer: la API no devuelve datos del usuario), el
 * ítem "No debe contener tu usuario ni tu DNI" queda `unknown`: lo valida el servidor al guardar.
 */
export function checklistItems(
  password: string,
  policy: PasswordPolicy,
  personalData?: { username: string; dni: string },
): ChecklistItem[] {
  const state = (met: boolean): ChecklistState => (met ? "met" : "unmet");
  const items: ChecklistItem[] = [
    { key: "minLength", label: `Al menos ${policy.minLength} caracteres`, state: state(length(password) >= policy.minLength) },
    {
      key: "maxLength",
      label: `Como máximo ${policy.maxLength} caracteres`,
      state: state(password !== "" && length(password) <= policy.maxLength),
    },
  ];
  if (policy.requireUppercase) {
    items.push({ key: "uppercase", label: "Una letra mayúscula", state: state(UPPERCASE.test(password)) });
  }
  if (policy.requireLowercase) {
    items.push({ key: "lowercase", label: "Una letra minúscula", state: state(LOWERCASE.test(password)) });
  }
  if (policy.requireDigit) items.push({ key: "digit", label: "Un número", state: state(DIGIT.test(password)) });
  if (policy.requireSpecial) {
    items.push({
      key: "special",
      label: "Un carácter especial (por ejemplo ! @ # $ %)",
      state: state(SPECIAL.test(password)),
    });
  }
  items.push({
    key: "personalData",
    label: "No debe contener tu usuario ni tu DNI",
    state:
      personalData === undefined
        ? "unknown"
        : state(password !== "" && !containsPersonalData(password, personalData.username, personalData.dni)),
  });
  return items;
}
