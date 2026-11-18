import type { AuditAction, AuditEntityType } from "../../lib/api";

/** Etiquetas de la bitácora (Anexo A.5), en el orden del anexo (así aparecen en el filtro "Acción"). */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  AUTH_LOGIN_SUCCEEDED: "Inicio de sesión",
  AUTH_LOGIN_FAILED: "Inicio de sesión fallido",
  AUTH_ACCOUNT_LOCKED: "Usuario bloqueado por intentos fallidos",
  AUTH_LOGOUT: "Cierre de sesión",
  AUTH_PASSWORD_CHANGED: "Cambio de contraseña",
  AUTH_PASSWORD_RESET_REQUESTED: "Solicitud de restablecimiento de contraseña",
  AUTH_PASSWORD_RESET_COMPLETED: "Contraseña restablecida por correo",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado",
  USER_ACTIVATED: "Usuario activado",
  USER_DEACTIVATED: "Usuario desactivado",
  USER_DELETED: "Usuario eliminado",
  USER_UNLOCKED: "Usuario desbloqueado",
  USER_PASSWORD_RESET_BY_ADMIN: "Contraseña temporal generada",
  PROFILE_UPDATED: "Perfil actualizado",
  DEALER_CREATED: "Dealer registrado",
  DEALER_UPDATED: "Dealer actualizado",
  DEALER_DELETED: "Dealer eliminado",
  DEALERS_EXPORTED: "Exportación de dealers",
  SYSTEM_PURGE: "Depuración de registros antiguos",
};

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

/** Tipos de entidad (Anexo A.5) y la ruta de su detalle (decisión D2, spec v1.5: enlace al detalle). */
export const ENTITY_TYPES: Record<AuditEntityType, { label: string; path: string }> = {
  USER: { label: "Usuario", path: "/usuarios" },
  DEALER: { label: "Dealer", path: "/dealers" },
};

export const AUDIT_ENTITY_TYPES = Object.keys(ENTITY_TYPES) as AuditEntityType[];

/** La API devuelve `action` y `entityType` como texto: uno desconocido se muestra tal cual. */
export function actionLabel(action: string): string {
  return (AUDIT_ACTION_LABELS as Record<string, string | undefined>)[action] ?? action;
}

export function entityType(value: string | null): (typeof ENTITY_TYPES)[AuditEntityType] | null {
  return value === null ? null : ((ENTITY_TYPES as Record<string, (typeof ENTITY_TYPES)[AuditEntityType] | undefined>)[value] ?? null);
}
