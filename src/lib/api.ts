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

export const API_BASE_PATH = "/api/v1/backoffice";

// 15 s por llamada, incluida la lectura del cuerpo (sección 8.2, igual que la landing).
const REQUEST_TIMEOUT_MS = 15_000;

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

// --- Internos ---

async function request<T>(method: Method, path: string, body?: unknown): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-Requested-With"] = "XMLHttpRequest";
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // AbortController + setTimeout (como la landing): el timeout también corta la lectura del cuerpo.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
      // Un 2xx sin JSON válido (o cortado por el timeout) cae en el catch: se trata como fallo de red.
      return { ok: true, data: (await response.json()) as T };
    }
    const errorBody: unknown = await response.json().catch(() => null);
    return httpFailure(response.status, errorBody);
  } catch {
    return NETWORK_FAILURE;
  } finally {
    clearTimeout(timer);
  }
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
