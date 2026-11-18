/**
 * Mi perfil (sección 6.4): nombres, apellidos, correo y celular. Si el correo cambia, la contraseña actual es
 * obligatoria (es el canal de recuperación). Mismos mensajes que la API (Anexo A.3).
 */
import { z } from "zod";
import type { Me, ProfileUpdateRequest } from "../../lib/api";
import { REQUIRED_MESSAGE } from "../../lib/errors";
import { emptyToNull, optionalField, requiredField } from "../../lib/fieldSchemas";
import { mobileError } from "../../lib/validators/phone";
import { emailError, normalizeEmail, personNameError } from "../../lib/validators/text";

export function profileSchema(currentEmail: string) {
  return z
    .object({
      firstNames: requiredField((value) => personNameError(value)),
      lastNames: requiredField((value) => personNameError(value)),
      email: requiredField(emailError),
      phone: optionalField(mobileError),
      currentPassword: z.string(),
    })
    .superRefine((values, ctx) => {
      if (emailChanged(values.email, currentEmail) && values.currentPassword === "") {
        ctx.addIssue({ code: "custom", path: ["currentPassword"], message: REQUIRED_MESSAGE });
      }
    });
}

export type ProfileFormValues = z.infer<ReturnType<typeof profileSchema>>;

export const PROFILE_FORM_FIELDS = ["firstNames", "lastNames", "email", "phone", "currentPassword"] as const;

/** El correo cambia si difiere del guardado tras normalizarlo como la API (trim + minúsculas). */
export function emailChanged(email: string, currentEmail: string): boolean {
  return normalizeEmail(email) !== currentEmail;
}

export function profileToFormValues(me: Me): ProfileFormValues {
  return { firstNames: me.firstNames, lastNames: me.lastNames, email: me.email, phone: me.phone ?? "", currentPassword: "" };
}

/** Se envían los cuatro campos (la API ignora los que no cambian); la contraseña, solo si cambia el correo. */
export function toProfileRequest(values: ProfileFormValues, currentEmail: string): ProfileUpdateRequest {
  const body: ProfileUpdateRequest = {
    firstNames: values.firstNames,
    lastNames: values.lastNames,
    email: values.email,
    phone: emptyToNull(values.phone),
  };
  if (emailChanged(values.email, currentEmail)) body.currentPassword = values.currentPassword;
  return body;
}
