/**
 * Datos de prueba de los e2e de B7 (usuarios y bitácora), con la forma del OpenAPI (`docs/openapi.json`).
 * Los usuarios del menú (`ADMIN`, `OPERATOR`) están en `mock-api.ts`; aquí, las fichas que ve el Administrador.
 */

export interface UserRef {
  id: string;
  username: string;
  fullName: string;
}

export interface UserDetail {
  id: string;
  username: string;
  firstNames: string;
  lastNames: string;
  dni: string;
  email: string;
  role: { code: string; name: string };
  status: "ACTIVO" | "INACTIVO" | "BLOQUEADO";
  lastLoginAt: string | null;
  phone: string | null;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  createdAt: string;
  createdBy: UserRef | null;
  updatedAt: string;
  updatedBy: UserRef | null;
  version: number;
}

export type UserSummary = Pick<
  UserDetail,
  "id" | "username" | "firstNames" | "lastNames" | "dni" | "email" | "role" | "status" | "lastLoginAt"
>;

export interface AuditLogItem {
  id: string;
  occurredAt: string;
  actor: UserRef | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export const ROLES = [
  { code: "ADMIN", name: "Administrador" },
  { code: "OPERADOR", name: "Operador" },
];

const ROLE_ADMIN = ROLES[0]!;
const ROLE_OPERATOR = ROLES[1]!;

export const ADMIN_REF: UserRef = {
  id: "6f0c0000-0000-4000-8000-000000000001",
  username: "admin",
  fullName: "Administrador General",
};

/** El Administrador que navega (mismo id que `ADMIN` de `mock-api.ts`): su fila oculta acciones. */
export const SELF_DETAIL: UserDetail = {
  id: ADMIN_REF.id,
  username: "admin",
  firstNames: "Administrador",
  lastNames: "General",
  dni: "00000000",
  email: "admin@backoffice.local",
  role: ROLE_ADMIN,
  status: "ACTIVO",
  lastLoginAt: "2026-11-15T10:35:00-05:00",
  phone: null,
  mustChangePassword: false,
  lockedUntil: null,
  createdAt: "2026-11-15T09:00:00-05:00",
  createdBy: null,
  updatedAt: "2026-11-15T09:00:00-05:00",
  updatedBy: null,
  version: 1,
};

export const ACTIVE_USER: UserDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "jperez",
  firstNames: "Juan",
  lastNames: "Pérez Gómez",
  dni: "12345678",
  email: "jperez@dominio.com",
  role: ROLE_OPERATOR,
  status: "ACTIVO",
  lastLoginAt: "2026-11-16T08:15:00-05:00",
  phone: "987654321",
  mustChangePassword: false,
  lockedUntil: null,
  createdAt: "2026-11-15T10:00:00-05:00",
  createdBy: ADMIN_REF,
  updatedAt: "2026-11-15T11:00:00-05:00",
  updatedBy: ADMIN_REF,
  version: 2,
};

export const INACTIVE_USER: UserDetail = {
  ...ACTIVE_USER,
  id: "22222222-2222-4222-8222-222222222222",
  username: "mlopez",
  firstNames: "María",
  lastNames: "López",
  dni: "23456789",
  email: "mlopez@dominio.com",
  role: ROLE_ADMIN,
  status: "INACTIVO",
  lastLoginAt: null,
  phone: null,
  version: 1,
};

export const LOCKED_USER: UserDetail = {
  ...ACTIVE_USER,
  id: "33333333-3333-4333-8333-333333333333",
  username: "cruiz",
  firstNames: "Carlos",
  lastNames: "Ruiz",
  dni: "34567890",
  email: "cruiz@dominio.com",
  status: "BLOQUEADO",
  lockedUntil: "2026-11-17T10:15:00-05:00",
  version: 1,
};

export const USERS: UserDetail[] = [SELF_DETAIL, ACTIVE_USER, INACTIVE_USER, LOCKED_USER];

export function summary(user: UserDetail): UserSummary {
  const { id, username, firstNames, lastNames, dni, email, role, status, lastLoginAt } = user;
  return { id, username, firstNames, lastNames, dni, email, role, status, lastLoginAt };
}

export function page<T>(items: T[], total = items.length, pageNumber = 1, pageSize = 20) {
  return { items, total, page: pageNumber, pageSize };
}

export const TEMPORARY_PASSWORD = "Xk7#mP2qR9vT!aHw4&Zc";

export const DEALER_ID = "44444444-4444-4444-8444-444444444444";

/** Un usuario eliminado: actor de la bitácora que no aparece en `GET /users`. */
export const DELETED_REF: UserRef = {
  id: "55555555-5555-4555-8555-555555555555",
  username: "exusuario",
  fullName: "Ex Usuario",
};

export const AUDIT_ITEMS: AuditLogItem[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    occurredAt: "2026-11-17T09:30:00-05:00",
    actor: ADMIN_REF,
    action: "USER_UPDATED",
    entityType: "USER",
    entityId: ACTIVE_USER.id,
    details: { changes: { email: { from: "juan@dominio.com", to: "jperez@dominio.com" } } },
    ipAddress: "190.12.34.56",
    userAgent: "Mozilla/5.0",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    occurredAt: "2026-11-17T09:00:00-05:00",
    actor: ADMIN_REF,
    action: "DEALER_CREATED",
    entityType: "DEALER",
    entityId: DEALER_ID,
    details: { dealerCode: "CL0001" },
    ipAddress: "190.12.34.56",
    userAgent: "Mozilla/5.0",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    occurredAt: "2026-11-16T22:10:00-05:00",
    actor: null,
    action: "AUTH_LOGIN_FAILED",
    entityType: "USER",
    entityId: null,
    details: { reason: "UNKNOWN_USER" },
    ipAddress: null,
    userAgent: null,
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    occurredAt: "2026-11-16T20:00:00-05:00",
    actor: ADMIN_REF,
    action: "AUTH_LOGOUT",
    entityType: "USER",
    entityId: ADMIN_REF.id,
    details: null,
    ipAddress: "190.12.34.56",
    userAgent: "Mozilla/5.0",
  },
];

// --- B8: Dealers y Ubigeo (sección 6.6 y 6.7) ---

export interface CodeName {
  code: string;
  name: string;
}

/**
 * Ubigeo simulado: solo códigos INEI citados en el spec y en el reporte (150101 LIMA/LIMA/LIMA, 070101
 * CALLAO/CALLAO/CALLAO, 150501 LIMA/CAÑETE/SAN VICENTE DE CAÑETE). El catálogo real viene de la API.
 */
export const DEPARTMENTS: CodeName[] = [
  { code: "07", name: "CALLAO" },
  { code: "15", name: "LIMA" },
];

export const PROVINCES: Record<string, CodeName[]> = {
  "07": [{ code: "0701", name: "CALLAO" }],
  "15": [
    { code: "1505", name: "CAÑETE" },
    { code: "1501", name: "LIMA" },
  ],
};

export const DISTRICTS: Record<string, CodeName[]> = {
  "0701": [{ code: "070101", name: "CALLAO" }],
  "1501": [{ code: "150101", name: "LIMA" }],
  "1505": [{ code: "150501", name: "SAN VICENTE DE CAÑETE" }],
};

/** Distrito, provincia y departamento de un código de distrito (como `DealerDetail`). */
export function ubigeoOf(districtCode: string) {
  const department = DEPARTMENTS.find((item) => item.code === districtCode.slice(0, 2))!;
  const province = PROVINCES[department.code]!.find((item) => item.code === districtCode.slice(0, 4))!;
  const district = DISTRICTS[province.code]!.find((item) => item.code === districtCode)!;
  return { district, province, department };
}

export interface DealerDetail {
  id: string;
  dealerCode: string;
  businessName: string | null;
  ruc: string;
  address: string;
  district: CodeName;
  province: CodeName;
  department: CodeName;
  contactEmail: string;
  contactPhone: string | null;
  contactName: string | null;
  createdAt: string;
  createdBy: UserRef | null;
  updatedAt: string;
  updatedBy: UserRef | null;
  version: number;
}

/** El ejemplo de `DealerDetail` de la sección 6.6. */
export const DEALER_LIMA: DealerDetail = {
  id: DEALER_ID,
  dealerCode: "CL0001",
  businessName: "ABC Motors S.A.C.",
  ruc: "20100047218",
  address: "Av. Ejemplo 123",
  ...ubigeoOf("150101"),
  contactEmail: "contacto@abcmotors.pe",
  contactPhone: "014567890",
  contactName: "María López",
  createdAt: "2026-11-15T10:35:00-05:00",
  createdBy: ADMIN_REF,
  updatedAt: "2026-11-16T09:00:00-05:00",
  updatedBy: ADMIN_REF,
  version: 1,
};

export const DEALER_CALLAO: DealerDetail = {
  ...DEALER_LIMA,
  id: "77777777-7777-4777-8777-777777777777",
  dealerCode: "CA0001",
  businessName: null,
  ruc: "20131312955",
  address: "Jr. Puerto 456",
  ...ubigeoOf("070101"),
  contactEmail: "ventas@puerto.pe",
  contactPhone: null,
  contactName: null,
  version: 2,
};

export const DEALERS: DealerDetail[] = [DEALER_CALLAO, DEALER_LIMA];

export const CREATED_DEALER_ID = "88888888-8888-4888-8888-888888888888";

/** Respuesta simulada de `GET /dealers/export`: el nombre sale de `Content-Disposition` (sección 6.6). */
export const EXPORT_FILENAME = "dealers_20261117_1030.xlsx";
export const EXPORT_CONTENT = "PK simulado";
