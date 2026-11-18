/**
 * Formulario de usuario (sección 6.5) con zod: espejo de las validaciones de la API, con sus mensajes (Anexo A.3).
 * El servidor normaliza y valida de nuevo; sus 409/422 se muestran en el campo.
 */
import { z } from "zod";
import type { RoleCode, UserCreateRequest, UserDetail, UserUpdateRequest } from "../../lib/api";
import { emptyToNull, optionalField, requiredField } from "../../lib/fieldSchemas";
import { dniError } from "../../lib/validators/dni";
import { mobileError } from "../../lib/validators/phone";
import { emailError, personNameError, usernameError } from "../../lib/validators/text";

export function userFormSchema(mode: "create" | "edit") {
  return z.object({
    dni: requiredField(dniError),
    firstNames: requiredField((value) => personNameError(value)),
    lastNames: requiredField((value) => personNameError(value)),
    // Al editar, el usuario no se envía ni se valida (es inmutable).
    username: mode === "create" ? requiredField(usernameError) : z.string(),
    email: requiredField(emailError),
    phone: optionalField(mobileError),
    roleCode: requiredField(),
  });
}

export type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>;

/** Campos del formulario que pueden traer un error de la API (`field` o `loc`, en camelCase). */
export const USER_FORM_FIELDS = ["dni", "firstNames", "lastNames", "username", "email", "phone", "roleCode"] as const;

export const EMPTY_USER_FORM: UserFormValues = {
  dni: "",
  firstNames: "",
  lastNames: "",
  username: "",
  email: "",
  phone: "",
  roleCode: "",
};

export function userToFormValues(user: UserDetail): UserFormValues {
  return {
    dni: user.dni,
    firstNames: user.firstNames,
    lastNames: user.lastNames,
    username: user.username,
    email: user.email,
    phone: user.phone ?? "",
    roleCode: user.role.code,
  };
}

/** El select solo ofrece los roles de `GET /roles` y el esquema exige uno: aquí ya es un `RoleCode`. */
function roleCode(value: string): RoleCode {
  return value as RoleCode;
}

export function toCreateRequest(values: UserFormValues): UserCreateRequest {
  return {
    dni: values.dni,
    firstNames: values.firstNames,
    lastNames: values.lastNames,
    username: values.username,
    email: values.email,
    phone: emptyToNull(values.phone),
    roleCode: roleCode(values.roleCode),
  };
}

/** PUT es un reemplazo completo (`phone` vacío lo borra). El propio usuario no cambia su rol (sección 8.6). */
export function toUpdateRequest(values: UserFormValues, user: UserDetail, isSelf: boolean): UserUpdateRequest {
  return {
    dni: values.dni,
    firstNames: values.firstNames,
    lastNames: values.lastNames,
    email: values.email,
    phone: emptyToNull(values.phone),
    roleCode: roleCode(isSelf ? user.role.code : values.roleCode),
    version: user.version,
  };
}
