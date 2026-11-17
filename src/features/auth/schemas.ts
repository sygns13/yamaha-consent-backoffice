/**
 * Validación en el cliente con zod, espejo de la API (sección 2.4). Textos: "Campo obligatorio" y "Debe tener como
 * máximo n caracteres" son los del traductor de errores de la API; la política usa el `detail` de `PASSWORD_POLICY`
 * (Anexo A.3) y la confirmación, "Las contraseñas no coinciden." (Anexo A.2).
 */
import { z } from "zod";
import type { PasswordPolicy } from "../../lib/api";
import { REQUIRED_MESSAGE } from "../../lib/errors";
import { passwordViolations, policyErrorDetail, type PasswordContext } from "../../lib/validators/password";

/** `LoginRequest` (OpenAPI): `username` hasta 30 y `password` hasta 20 (el máximo de la política, v1.2). */
const LOGIN_USERNAME_MAX_LENGTH = 30;
const LOGIN_PASSWORD_MAX_LENGTH = 20;
/** `ForgotPasswordRequest.identifier`. */
const IDENTIFIER_MAX_LENGTH = 254;

const PASSWORDS_DO_NOT_MATCH = "Las contraseñas no coinciden.";

const maxLengthMessage = (max: number) => `Debe tener como máximo ${max} caracteres`;

export const loginSchema = z.object({
  username: z.string().trim().min(1, REQUIRED_MESSAGE).max(LOGIN_USERNAME_MAX_LENGTH, maxLengthMessage(LOGIN_USERNAME_MAX_LENGTH)),
  password: z.string().min(1, REQUIRED_MESSAGE).max(LOGIN_PASSWORD_MAX_LENGTH, maxLengthMessage(LOGIN_PASSWORD_MAX_LENGTH)),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, REQUIRED_MESSAGE).max(IDENTIFIER_MAX_LENGTH, maxLengthMessage(IDENTIFIER_MAX_LENGTH)),
});

interface NewPasswordValues {
  newPassword: string;
  confirmPassword: string;
}

function checkNewPassword(
  values: NewPasswordValues,
  policy: PasswordPolicy,
  context: PasswordContext,
  ctx: z.RefinementCtx,
): void {
  if (values.newPassword === "") {
    ctx.addIssue({ code: "custom", path: ["newPassword"], message: REQUIRED_MESSAGE });
  } else {
    const violations = passwordViolations(values.newPassword, policy, context);
    if (violations.length > 0) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: policyErrorDetail(violations) });
    }
  }
  if (values.confirmPassword === "") {
    ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: REQUIRED_MESSAGE });
  } else if (values.newPassword !== values.confirmPassword) {
    ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: PASSWORDS_DO_NOT_MATCH });
  }
}

/** Restablecer: sin usuario ni DNI (la API no los devuelve); el servidor valida ese requisito (decisión D2). */
export function resetPasswordSchema(policy: PasswordPolicy) {
  return z
    .object({ newPassword: z.string(), confirmPassword: z.string() })
    .superRefine((values, ctx) => checkNewPassword(values, policy, {}, ctx));
}

/** Cambiar contraseña: con el usuario y el DNI de `me`, y distinta de la actual. */
export function changePasswordSchema(policy: PasswordPolicy, user: { username: string; dni: string }) {
  return z
    .object({ currentPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
    .superRefine((values, ctx) => {
      if (values.currentPassword === "") {
        ctx.addIssue({ code: "custom", path: ["currentPassword"], message: REQUIRED_MESSAGE });
      }
      checkNewPassword(values, policy, { ...user, currentPassword: values.currentPassword }, ctx);
    });
}
