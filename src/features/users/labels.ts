import type { BadgeVariant } from "../../components/Badge";
import type { RoleCode, UserStatus } from "../../lib/api";

export const ROLE_CODES = ["ADMIN", "OPERADOR"] as const satisfies readonly RoleCode[];
export const USER_STATUSES = ["ACTIVO", "INACTIVO", "BLOQUEADO"] as const satisfies readonly UserStatus[];

/** Anexo A.2 (Usuarios lista). */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  BLOQUEADO: "Bloqueado",
};

/** Sección 8.6: Activo verde, Inactivo gris, Bloqueado ámbar. */
export const USER_STATUS_BADGES: Record<UserStatus, BadgeVariant> = {
  ACTIVO: "success",
  INACTIVO: "neutral",
  BLOQUEADO: "warning",
};

/** Título del documento y de la página de detalle (aprobado en el spec v1.5, T4). */
export const USER_DETAIL_TITLE = "Detalle del usuario";

/** Texto de la API para `404 NOT_FOUND` de un usuario (Anexo A.3); también para un id mal formado en la URL. */
export const USER_NOT_FOUND = "No existe el usuario.";
