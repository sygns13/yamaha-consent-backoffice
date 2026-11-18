/**
 * Cliente de la API del BackOffice (sección 8.2). Es el único archivo con `fetch` (sección 8.1).
 *
 * - Rutas relativas `/api/v1/backoffice/...`: mismo origen en todos los entornos (sección 2.3), sin URL de API en el
 *   build. La sesión viaja sola en la cookie HttpOnly `__session` (`credentials: "same-origin"`).
 * - `X-Requested-With: XMLHttpRequest` en toda mutación (sección 5.6): sin ella la API responde 403.
 * - Nunca lanza excepciones: devuelve `{ ok: true, data }` o un `ApiFailure`.
 * - Los tipos salen de `api-schema.d.ts`, generado desde `docs/openapi.json` (`npm run api:types`).
 */
import type { components } from "./api-schema";

type Schemas = components["schemas"];

export type Me = Schemas["Me"];
export type CodeName = Schemas["CodeName"];
export type LoginRequest = Schemas["LoginRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];
export type PasswordPolicy = Schemas["PasswordPolicyResponse"];
export type ForgotPasswordRequest = Schemas["ForgotPasswordRequest"];
export type DetailResponse = Schemas["DetailResponse"];
export type PasswordResetRequest = Schemas["PasswordResetRequest"];
/** `tokenStatus` es `string` en el OpenAPI; estos son sus valores (sección 6.3). */
export type ResetTokenStatus = "VALID" | "EXPIRED" | "USED" | "INVALID";

// Usuarios, perfil y bitácora (secciones 6.4, 6.5 y 6.8).
export type RoleCode = Schemas["RoleCode"];
export type UserStatus = Schemas["UserStatus"];
export type UserRef = Schemas["UserRef"];
export type UserSummary = Schemas["UserSummary"];
export type UserDetail = Schemas["UserDetail"];
export type UserCreateRequest = Schemas["UserCreateRequest"];
export type UserUpdateRequest = Schemas["UserUpdateRequest"];
export type UserCreatedResponse = Schemas["UserCreatedResponse"];
export type TemporaryPasswordResponse = Schemas["TemporaryPasswordResponse"];
export type ProfileUpdateRequest = Schemas["ProfileUpdateRequest"];
export type AuditAction = Schemas["AuditAction"];
export type AuditEntityType = Schemas["AuditEntityType"];
export type AuditLogItem = Schemas["AuditLogItem"];

/** Respuesta de las listas paginadas (sección 6.1). */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortOrder = "asc" | "desc";

/** Paginación y orden de las listas (sección 6.1). */
export interface PageParams {
  page: number;
  pageSize: number;
}

export interface UserListParams extends PageParams {
  q?: string;
  roleCode?: RoleCode;
  status?: UserStatus;
  sortBy: "lastNames" | "username" | "createdAt" | "lastLoginAt";
  sortOrder: SortOrder;
}

export interface AuditLogParams extends PageParams {
  /** `AAAA-MM-DD`, en hora de Lima (sección 6.8). */
  from?: string;
  to?: string;
  actorUserId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
}

// Dealers (sección 6.6).
export type DealerDetail = Schemas["DealerDetail"];
export type DealerCreateRequest = Schemas["DealerCreateRequest"];
export type DealerUpdateRequest = Schemas["DealerUpdateRequest"];

export type DealerSort = "dealerCode" | "businessName" | "ruc" | "createdAt" | "updatedAt";

/** Filtros y orden de la lista de dealers; la exportación usa los mismos, sin paginación (sección 6.6). */
export interface DealerFilters {
  q?: string;
  departmentCode?: string;
  provinceCode?: string;
  districtUbigeo?: string;
  sortBy: DealerSort;
  sortOrder: SortOrder;
}

export interface DealerListParams extends DealerFilters, PageParams {}

/** Archivo descargado: el contenido y el nombre de `Content-Disposition`. */
export interface ExportedFile {
  blob: Blob;
  filename: string;
}

/** Valores de los parámetros de query: los vacíos (`undefined`, `null`, `""`) no se envían. */
type QueryValue = string | number | null | undefined;

export const API_BASE_PATH = "/api/v1/backoffice";

// 15 s por llamada, incluida la lectura del cuerpo (sección 8.2, igual que la landing).
const REQUEST_TIMEOUT_MS = 15_000;
// La exportación a Excel: 60 s, el límite de los rewrites de Firebase Hosting (sección 2.3; decisión D3, spec v1.5).
export const EXPORT_TIMEOUT_MS = 60_000;

/**
 * Fallo de una llamada. `NETWORK`: sin respuesta (red, timeout); `status` es 0. `HTTP`: respuesta no 2xx.
 * `fieldErrors` (campo en camelCase → mensaje) sale del 422 de Pydantic (último elemento de `loc`) o de `field`.
 */
export interface ApiFailure {
  ok: false;
  kind: "NETWORK" | "HTTP";
  status: number;
  code?: string;
  detail?: string;
  field?: string;
  fieldErrors?: Record<string, string>;
}

export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const NETWORK_FAILURE: ApiFailure = { ok: false, kind: "NETWORK", status: 0 };

// --- Autenticación (sección 6.3) ---

export function login(body: LoginRequest): Promise<ApiResult<Me>> {
  return request<Me>("POST", "/auth/login", body);
}

export function logout(): Promise<ApiResult<void>> {
  return request<void>("POST", "/auth/logout");
}

export function getMe(): Promise<ApiResult<Me>> {
  return request<Me>("GET", "/auth/me");
}

export function changePassword(body: ChangePasswordRequest): Promise<ApiResult<void>> {
  return request<void>("POST", "/auth/change-password", body);
}

export function getPasswordPolicy(): Promise<ApiResult<PasswordPolicy>> {
  return request<PasswordPolicy>("GET", "/auth/password-policy");
}

export function forgotPassword(body: ForgotPasswordRequest): Promise<ApiResult<DetailResponse>> {
  return request<DetailResponse>("POST", "/auth/forgot-password", body);
}

export function getResetTokenStatus(token: string): Promise<ApiResult<{ tokenStatus: string }>> {
  return request<{ tokenStatus: string }>("GET", `/auth/password-reset/${encodeURIComponent(token)}`);
}

export function resetPassword(body: PasswordResetRequest): Promise<ApiResult<void>> {
  return request<void>("POST", "/auth/password-reset", body);
}

// --- Mi perfil (sección 6.4) ---

export function getProfile(): Promise<ApiResult<Me>> {
  return request<Me>("GET", "/profile");
}

export function updateProfile(body: ProfileUpdateRequest): Promise<ApiResult<Me>> {
  return request<Me>("PATCH", "/profile", body);
}

// --- Usuarios (sección 6.5) ---

export function listRoles(): Promise<ApiResult<CodeName[]>> {
  return request<CodeName[]>("GET", "/roles");
}

export function listUsers(params: UserListParams): Promise<ApiResult<Page<UserSummary>>> {
  return request<Page<UserSummary>>("GET", withQuery("/users", { ...params }));
}

export function getUser(userId: string): Promise<ApiResult<UserDetail>> {
  return request<UserDetail>("GET", userPath(userId));
}

export function createUser(body: UserCreateRequest): Promise<ApiResult<UserCreatedResponse>> {
  return request<UserCreatedResponse>("POST", "/users", body);
}

export function updateUser(userId: string, body: UserUpdateRequest): Promise<ApiResult<UserDetail>> {
  return request<UserDetail>("PUT", userPath(userId), body);
}

export function deleteUser(userId: string): Promise<ApiResult<void>> {
  return request<void>("DELETE", userPath(userId));
}

export function activateUser(userId: string): Promise<ApiResult<UserDetail>> {
  return request<UserDetail>("POST", `${userPath(userId)}/activate`);
}

export function deactivateUser(userId: string): Promise<ApiResult<UserDetail>> {
  return request<UserDetail>("POST", `${userPath(userId)}/deactivate`);
}

export function unlockUser(userId: string): Promise<ApiResult<UserDetail>> {
  return request<UserDetail>("POST", `${userPath(userId)}/unlock`);
}

export function resetUserPassword(userId: string): Promise<ApiResult<TemporaryPasswordResponse>> {
  return request<TemporaryPasswordResponse>("POST", `${userPath(userId)}/reset-password`);
}

// --- Bitácora (sección 6.8) ---

export function listAuditLogs(params: AuditLogParams): Promise<ApiResult<Page<AuditLogItem>>> {
  return request<Page<AuditLogItem>>("GET", withQuery("/audit-logs", { ...params }));
}

// --- Dealers (sección 6.6) y Ubigeo (sección 6.7) ---

export function listDealers(params: DealerListParams): Promise<ApiResult<Page<DealerDetail>>> {
  return request<Page<DealerDetail>>("GET", withQuery("/dealers", { ...params }));
}

export function getDealer(dealerId: string): Promise<ApiResult<DealerDetail>> {
  return request<DealerDetail>("GET", dealerPath(dealerId));
}

export function createDealer(body: DealerCreateRequest): Promise<ApiResult<DealerDetail>> {
  return request<DealerDetail>("POST", "/dealers", body);
}

export function updateDealer(dealerId: string, body: DealerUpdateRequest): Promise<ApiResult<DealerDetail>> {
  return request<DealerDetail>("PUT", dealerPath(dealerId), body);
}

export function deleteDealer(dealerId: string): Promise<ApiResult<void>> {
  return request<void>("DELETE", dealerPath(dealerId));
}

export function listDepartments(): Promise<ApiResult<CodeName[]>> {
  return request<CodeName[]>("GET", "/ubigeo/departments");
}

export function listProvinces(departmentCode: string): Promise<ApiResult<CodeName[]>> {
  return request<CodeName[]>("GET", `/ubigeo/departments/${encodeURIComponent(departmentCode)}/provinces`);
}

export function listDistricts(provinceCode: string): Promise<ApiResult<CodeName[]>> {
  return request<CodeName[]>("GET", `/ubigeo/provinces/${encodeURIComponent(provinceCode)}/districts`);
}

/** Nombre si `Content-Disposition` no trae uno (no debería pasar: la API siempre lo envía). */
const EXPORT_FALLBACK_FILENAME = "dealers.xlsx";
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * `GET /dealers/export` con los filtros y el orden de la lista, sin paginación (sección 6.6). El `fetch` va aquí, como
 * toda llamada (sección 8.2); `download.ts` solo arma el enlace. Timeout de 60 s, el límite de Firebase Hosting
 * (sección 2.3; decisión D3, spec v1.5).
 */
export function exportDealers(filters: DealerFilters): Promise<ApiResult<ExportedFile>> {
  return request<ExportedFile>("GET", withQuery("/dealers/export", { ...filters }), undefined, {
    timeoutMs: EXPORT_TIMEOUT_MS,
    accept: `${XLSX_TYPE}, application/json`,
    read: async (response) => ({
      blob: await response.blob(),
      filename: filenameFromContentDisposition(response.headers.get("Content-Disposition")) ?? EXPORT_FALLBACK_FILENAME,
    }),
  });
}

// --- Internos ---

function dealerPath(dealerId: string): string {
  return `/dealers/${encodeURIComponent(dealerId)}`;
}

function userPath(userId: string): string {
  return `/users/${encodeURIComponent(userId)}`;
}

/** Agrega la query sin los valores vacíos. */
export function withQuery(path: string, params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

interface RequestOptions<T> {
  /** Por defecto 15 s (sección 8.2). La exportación a Excel usa 60 s (decisión D3, spec v1.5). */
  timeoutMs?: number;
  accept?: string;
  /** Lee una respuesta 2xx distinta de 204. Por defecto, JSON. */
  read?: (response: Response) => Promise<T>;
}

async function request<T>(method: Method, path: string, body?: unknown, options: RequestOptions<T> = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: options.accept ?? "application/json" };
  if (method !== "GET") headers["X-Requested-With"] = "XMLHttpRequest";
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // AbortController + setTimeout (como la landing): el timeout también corta la lectura del cuerpo.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.ok) {
      if (response.status === 204) return { ok: true, data: undefined as T };
      // Un 2xx que no se puede leer (o cortado por el timeout) cae en el catch: se trata como fallo de red.
      const data = options.read ? await options.read(response) : ((await response.json()) as T);
      return { ok: true, data };
    }
    const errorBody: unknown = await response.json().catch(() => null);
    return httpFailure(response.status, errorBody);
  } catch {
    return NETWORK_FAILURE;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Nombre del archivo de `Content-Disposition` (`attachment; filename="dealers_20261117_1030.xlsx"`, sección 6.6).
 * Acepta también `filename*=UTF-8''...`. Sin nombre utilizable → null. Solo el nombre, sin rutas.
 */
export function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)?.[1];
  let name: string | undefined;
  if (encoded) {
    try {
      name = decodeURIComponent(encoded.trim());
    } catch {
      name = undefined;
    }
  }
  name ??= /filename\s*=\s*"([^"]*)"/i.exec(header)?.[1] ?? /filename\s*=\s*([^;]+)/i.exec(header)?.[1]?.trim();
  const base = name?.split(/[/\\]/).at(-1)?.trim();
  return base ? base : null;
}

/** Arma el fallo HTTP desde `{detail, code, field?}` (sección 5.8) o desde el 422 de Pydantic (`{detail: [...]}`). */
function httpFailure(status: number, body: unknown): ApiFailure {
  const failure: ApiFailure = { ok: false, kind: "HTTP", status };
  if (!isRecord(body)) return failure;

  if (typeof body.detail === "string") {
    failure.detail = body.detail;
    if (typeof body.code === "string") failure.code = body.code;
    if (typeof body.field === "string") {
      failure.field = body.field;
      failure.fieldErrors = { [body.field]: body.detail };
    }
  } else if (Array.isArray(body.detail)) {
    const fieldErrors = validationFieldErrors(body.detail);
    if (Object.keys(fieldErrors).length > 0) failure.fieldErrors = fieldErrors;
  }
  return failure;
}

/** `[{type, loc, msg}]` → `{campo: msg}` con el último elemento de `loc`. Si un campo repite, gana el primero. */
function validationFieldErrors(items: unknown[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const item of items) {
    if (!isRecord(item) || !Array.isArray(item.loc) || typeof item.msg !== "string") continue;
    const field: unknown = item.loc.at(-1);
    if (typeof field === "string" && !(field in errors)) errors[field] = item.msg;
  }
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
