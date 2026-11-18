import { test as base, expect, type Page, type Route } from "@playwright/test";
import {
  AUDIT_ITEMS,
  CREATED_DEALER_ID,
  DEALERS,
  DEPARTMENTS,
  DISTRICTS,
  EXPORT_CONTENT,
  EXPORT_FILENAME,
  page,
  PROVINCES,
  ROLES,
  summary,
  TEMPORARY_PASSWORD,
  ubigeoOf,
  USERS,
  type DealerDetail,
  type UserDetail,
} from "./fixtures";

/**
 * API del BackOffice simulada con page.route (sin backend). Mismo origen: el build llama a /api/v1/backoffice/...
 *
 * - `api.user` simula la cookie `__session`: `/auth/me` responde 200 con ese usuario, o 401 `AUTH_REQUIRED` si es
 *   null. Un login 200 lo fija, un logout lo borra y un cambio de contraseña 204 baja `mustChangePassword`, como la
 *   API real.
 * - `api.respond(endpoint, ...respuestas)`: cada llamada toma la siguiente respuesta y la última se repite (como en la
 *   landing). `"network-error"` corta la conexión.
 * - B6.8: toda mutación sin `X-Requested-With: XMLHttpRequest` recibe 403 `CSRF_HEADER_MISSING` y hace fallar el
 *   test al terminar (fixture `api`). Una petición sin endpoint simulado también.
 * - B7 y B8: usuarios, perfil, bitácora, dealers y ubigeo responden por defecto con los datos de `fixtures.ts` (sin
 *   estado: cada test simula lo que necesita con `respond`). `RecordedRequest.query` guarda los parámetros de la URL.
 */

/**
 * Respuesta simulada. `body` va como JSON; `raw` (con `headers`) es un cuerpo tal cual, p. ej. el Excel. `delayMs`
 * retrasa la respuesta (para ver estados intermedios como "Exportando...").
 */
export type MockResponse =
  | { status: number; body?: unknown; raw?: string; headers?: Record<string, string>; delayMs?: number }
  | "network-error";

export interface Me {
  id: string;
  username: string;
  firstNames: string;
  lastNames: string;
  dni: string;
  email: string;
  phone: string | null;
  role: { code: string; name: string };
  modules: { code: string; name: string }[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  sessionExpiresAt: string;
}

const ALL_MODULES = [
  { code: "DEALERS", name: "Gestión de Dealers" },
  { code: "USUARIOS", name: "Administración de usuarios" },
  { code: "AUDITORIA", name: "Bitácora de auditoría" },
];

export const ADMIN: Me = {
  id: "6f0c0000-0000-4000-8000-000000000001",
  username: "admin",
  firstNames: "Administrador",
  lastNames: "General",
  dni: "00000000",
  email: "admin@backoffice.local",
  phone: null,
  role: { code: "ADMIN", name: "Administrador" },
  modules: ALL_MODULES,
  mustChangePassword: false,
  lastLoginAt: "2026-11-15T10:35:00-05:00",
  sessionExpiresAt: "2026-11-15T22:35:00-05:00",
};

export const OPERATOR: Me = {
  ...ADMIN,
  id: "6f0c0000-0000-4000-8000-000000000002",
  username: "operador",
  firstNames: "Olga",
  lastNames: "Ramírez Soto",
  dni: "12345678",
  email: "operador@backoffice.local",
  role: { code: "OPERADOR", name: "Operador" },
  modules: [ALL_MODULES[0]!],
};

/** Usuario recién creado: contraseña temporal, cambio obligatorio. */
export const NEW_ADMIN: Me = { ...ADMIN, mustChangePassword: true, lastLoginAt: null };

export const POLICY = {
  minLength: 8,
  maxLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

export const ok = (body: unknown, status = 200): MockResponse => ({ status, body });
export const noContent: MockResponse = { status: 204 };
export const apiError = (status: number, code: string, detail: string, field?: string): MockResponse => ({
  status,
  body: field === undefined ? { detail, code } : { detail, code, field },
});

export const FORGOT_PASSWORD_DETAIL =
  "Si los datos corresponden a un usuario activo, te enviaremos un correo con un enlace para restablecer tu contraseña. El enlace vence en 30 minutos.";

const ENDPOINTS = {
  login: ["POST", /^\/auth\/login$/],
  logout: ["POST", /^\/auth\/logout$/],
  me: ["GET", /^\/auth\/me$/],
  changePassword: ["POST", /^\/auth\/change-password$/],
  passwordPolicy: ["GET", /^\/auth\/password-policy$/],
  forgotPassword: ["POST", /^\/auth\/forgot-password$/],
  resetTokenStatus: ["GET", /^\/auth\/password-reset\/[^/]+$/],
  passwordReset: ["POST", /^\/auth\/password-reset$/],
  // B7: Mi perfil, usuarios y bitácora (secciones 6.4, 6.5 y 6.8).
  profile: ["GET", /^\/profile$/],
  profileUpdate: ["PATCH", /^\/profile$/],
  roles: ["GET", /^\/roles$/],
  users: ["GET", /^\/users$/],
  userCreate: ["POST", /^\/users$/],
  user: ["GET", /^\/users\/[^/]+$/],
  userUpdate: ["PUT", /^\/users\/[^/]+$/],
  userDelete: ["DELETE", /^\/users\/[^/]+$/],
  userActivate: ["POST", /^\/users\/[^/]+\/activate$/],
  userDeactivate: ["POST", /^\/users\/[^/]+\/deactivate$/],
  userUnlock: ["POST", /^\/users\/[^/]+\/unlock$/],
  userResetPassword: ["POST", /^\/users\/[^/]+\/reset-password$/],
  auditLogs: ["GET", /^\/audit-logs$/],
  // B8: Dealers y Ubigeo (secciones 6.6 y 6.7). `export` y `lookup` no son ids.
  dealers: ["GET", /^\/dealers$/],
  dealerCreate: ["POST", /^\/dealers$/],
  dealerExport: ["GET", /^\/dealers\/export$/],
  dealer: ["GET", /^\/dealers\/(?!export$|lookup$)[^/]+$/],
  dealerUpdate: ["PUT", /^\/dealers\/[^/]+$/],
  dealerDelete: ["DELETE", /^\/dealers\/[^/]+$/],
  ubigeoDepartments: ["GET", /^\/ubigeo\/departments$/],
  ubigeoProvinces: ["GET", /^\/ubigeo\/departments\/[^/]+\/provinces$/],
  ubigeoDistricts: ["GET", /^\/ubigeo\/provinces\/[^/]+\/districts$/],
} as const satisfies Record<string, readonly [string, RegExp]>;

export type Endpoint = keyof typeof ENDPOINTS;

export interface RecordedRequest {
  endpoint: Endpoint | null;
  method: string;
  path: string;
  /** Parámetros de la query (sin los vacíos, que el cliente no envía). */
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
}

const PREFIX = "/api/v1/backoffice";
const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class MockApi {
  /** Sesión simulada (cookie `__session`). */
  user: Me | null = null;
  readonly requests: RecordedRequest[] = [];
  private readonly queues = new Map<Endpoint, MockResponse[]>();
  private readonly counts = new Map<Endpoint, number>();

  respond(endpoint: Endpoint, ...responses: MockResponse[]): void {
    this.queues.set(endpoint, responses);
    this.counts.set(endpoint, 0);
  }

  calls(endpoint: Endpoint): RecordedRequest[] {
    return this.requests.filter((request) => request.endpoint === endpoint);
  }

  csrfViolations(): string[] {
    return this.requests
      .filter((request) => MUTATIONS.has(request.method) && request.headers["x-requested-with"] !== "XMLHttpRequest")
      .map((request) => `${request.method} ${request.path}`);
  }

  unhandled(): string[] {
    return this.requests.filter((request) => request.endpoint === null).map((r) => `${r.method} ${r.path}`);
  }

  async install(page: Page): Promise<void> {
    await page.route(`**${PREFIX}/**`, (route) => this.handle(route));
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.slice(PREFIX.length);
    const endpoint =
      (Object.keys(ENDPOINTS) as Endpoint[]).find((name) => {
        const [expectedMethod, pattern] = ENDPOINTS[name];
        return expectedMethod === method && pattern.test(path);
      }) ?? null;
    const raw = request.postData();
    const recorded: RecordedRequest = {
      endpoint,
      method,
      path,
      query: Object.fromEntries(url.searchParams),
      headers: await request.allHeaders(),
      body: raw ? (JSON.parse(raw) as unknown) : null,
    };
    this.requests.push(recorded);

    if (MUTATIONS.has(method) && recorded.headers["x-requested-with"] !== "XMLHttpRequest") {
      return fulfill(route, apiError(403, "CSRF_HEADER_MISSING", "Solicitud no permitida."));
    }
    if (endpoint === null) return fulfill(route, apiError(404, "NOT_FOUND", "No existe."));

    const response = this.next(endpoint) ?? this.defaultResponse(endpoint, recorded);
    this.applySideEffects(endpoint, response);
    return fulfill(route, response);
  }

  private next(endpoint: Endpoint): MockResponse | undefined {
    const queue = this.queues.get(endpoint);
    if (queue === undefined || queue.length === 0) return undefined;
    const index = this.counts.get(endpoint) ?? 0;
    this.counts.set(endpoint, index + 1);
    return queue[Math.min(index, queue.length - 1)];
  }

  private defaultResponse(endpoint: Endpoint, request: RecordedRequest): MockResponse {
    // `/users/{id}/...`, `/dealers/{id}`, `/ubigeo/departments/{code}/provinces`, `/ubigeo/provinces/{code}/districts`.
    const userId = request.path.split("/")[2] ?? "";
    const dealerId = userId;
    const ubigeoCode = request.path.split("/")[3] ?? "";
    switch (endpoint) {
      case "me":
        return this.user ? ok(this.user) : apiError(401, "AUTH_REQUIRED", "Debes iniciar sesión.");
      case "passwordPolicy":
        return ok(POLICY);
      case "logout":
      case "changePassword":
      case "passwordReset":
        return noContent;
      case "forgotPassword":
        return ok({ detail: FORGOT_PASSWORD_DETAIL }, 202);
      case "resetTokenStatus":
        return ok({ tokenStatus: "VALID" });
      case "login":
        return apiError(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos.");
      case "profile":
        return this.user ? ok(this.user) : apiError(401, "AUTH_REQUIRED", "Debes iniciar sesión.");
      case "profileUpdate": {
        if (!this.user) return apiError(401, "AUTH_REQUIRED", "Debes iniciar sesión.");
        // `Me` no trae la contraseña actual que acompaña al cambio de correo.
        const changes = { ...(request.body as Record<string, unknown>) };
        delete changes.currentPassword;
        return ok({ ...this.user, ...changes });
      }
      case "roles":
        return ok(ROLES);
      case "users":
        return ok(page(USERS.map(summary)));
      case "userCreate":
        return ok({ user: createdUser(request.body), temporaryPassword: TEMPORARY_PASSWORD }, 201);
      case "user":
        return userResponse(userId, (user) => user);
      case "userUpdate":
        return userResponse(userId, (user) => ({ ...user, ...(request.body as object), version: user.version + 1 }));
      case "userDelete":
        return noContent;
      case "userActivate":
        return userResponse(userId, (user) => ({ ...user, status: "ACTIVO" }));
      case "userDeactivate":
        return userResponse(userId, (user) => ({ ...user, status: "INACTIVO" }));
      case "userUnlock":
        return userResponse(userId, (user) => ({ ...user, status: "ACTIVO", lockedUntil: null }));
      case "userResetPassword":
        return ok({ temporaryPassword: TEMPORARY_PASSWORD });
      case "auditLogs":
        return ok(page(AUDIT_ITEMS));
      case "dealers":
        return ok(page(DEALERS));
      case "dealerCreate":
        return ok(dealerFromBody(request.body, { id: CREATED_DEALER_ID, version: 1 }), 201);
      case "dealer":
        return dealerResponse(dealerId, (dealer) => dealer);
      case "dealerUpdate":
        return dealerResponse(dealerId, (dealer) => dealerFromBody(request.body, { ...dealer, version: dealer.version + 1 }));
      case "dealerDelete":
        return noContent;
      case "dealerExport":
        return {
          status: 200,
          raw: EXPORT_CONTENT,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${EXPORT_FILENAME}"`,
          },
        };
      case "ubigeoDepartments":
        return ok(DEPARTMENTS);
      case "ubigeoProvinces":
        return PROVINCES[ubigeoCode] ? ok(PROVINCES[ubigeoCode]) : apiError(404, "NOT_FOUND", "No existe el departamento.");
      case "ubigeoDistricts":
        return DISTRICTS[ubigeoCode] ? ok(DISTRICTS[ubigeoCode]) : apiError(404, "NOT_FOUND", "No existe la provincia.");
    }
  }

  private applySideEffects(endpoint: Endpoint, response: MockResponse): void {
    if (response === "network-error") return;
    if (endpoint === "login" && response.status === 200) this.user = response.body as Me;
    if (endpoint === "logout" && response.status === 204) this.user = null;
    if (endpoint === "profileUpdate" && response.status === 200) this.user = response.body as Me;
    if (endpoint === "changePassword" && response.status === 204 && this.user) {
      this.user = { ...this.user, mustChangePassword: false };
    }
  }
}

const USER_NOT_FOUND = apiError(404, "NOT_FOUND", "No existe el usuario.");

/** La ficha de `fixtures.ts` con ese id (transformada), o 404 como la API. */
function userResponse(userId: string, transform: (user: UserDetail) => UserDetail): MockResponse {
  const user = USERS.find((candidate) => candidate.id === userId);
  return user ? ok(transform(user)) : USER_NOT_FOUND;
}

export const CREATED_USER_ID = "66666666-6666-4666-8666-666666666666";

/** `UserDetail` de un alta simulada a partir del body del `POST /users`. */
function createdUser(body: unknown): UserDetail {
  const request = body as Record<string, string | null>;
  const role = ROLES.find((candidate) => candidate.code === request.roleCode) ?? ROLES[1]!;
  return {
    ...USERS[1]!,
    id: CREATED_USER_ID,
    username: request.username ?? "",
    firstNames: request.firstNames ?? "",
    lastNames: request.lastNames ?? "",
    dni: request.dni ?? "",
    email: request.email ?? "",
    phone: request.phone ?? null,
    role,
    status: "ACTIVO",
    mustChangePassword: true,
    lastLoginAt: null,
    version: 1,
  };
}

const DEALER_NOT_FOUND = apiError(404, "NOT_FOUND", "No existe el dealer.");

function dealerResponse(dealerId: string, transform: (dealer: DealerDetail) => DealerDetail): MockResponse {
  const dealer = DEALERS.find((candidate) => candidate.id === dealerId);
  return dealer ? ok(transform(dealer)) : DEALER_NOT_FOUND;
}

/** `DealerDetail` a partir del body de un alta o edición (el distrito determina provincia y departamento). */
function dealerFromBody(body: unknown, base: Partial<DealerDetail>): DealerDetail {
  const request = body as Record<string, string | null>;
  return {
    ...DEALERS[1]!,
    ...base,
    dealerCode: request.dealerCode ?? base.dealerCode ?? "",
    businessName: request.businessName ?? null,
    ruc: request.ruc ?? "",
    address: request.address ?? "",
    ...ubigeoOf(request.districtUbigeo ?? "150101"),
    contactEmail: request.contactEmail ?? "",
    contactPhone: request.contactPhone ?? null,
    contactName: request.contactName ?? null,
  };
}

async function fulfill(route: Route, response: MockResponse): Promise<void> {
  if (response === "network-error") return route.abort("internetdisconnected");
  if (response.delayMs) await new Promise((resolve) => setTimeout(resolve, response.delayMs));
  if (response.raw !== undefined) return route.fulfill({ status: response.status, headers: response.headers, body: response.raw });
  if (response.body === undefined) return route.fulfill({ status: response.status });
  return route.fulfill({ status: response.status, json: response.body });
}

/**
 * `test` con la API simulada instalada en **todo** test (`auto`): ninguna petición llega al proxy de `vite preview`
 * (que apunta a una API local real). Al terminar verifica el CSRF (B6.8), que nada quedó sin simular, que la CSP de
 * la sección 8.8 no bloqueó nada y que no hubo errores sin capturar en la página.
 */
export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ page }, provide) => {
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`Error sin capturar: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error" && /Content Security Policy/i.test(message.text())) problems.push(message.text());
      });
      const api = new MockApi();
      await api.install(page);
      await provide(api);
      expect(api.csrfViolations(), "B6.8: toda mutación lleva X-Requested-With").toEqual([]);
      expect(api.unhandled(), "peticiones a la API sin respuesta simulada").toEqual([]);
      expect(problems, "CSP o errores de la página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
