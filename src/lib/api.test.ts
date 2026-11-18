import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateUser,
  changePassword,
  deleteUser,
  exportDealers,
  filenameFromContentDisposition,
  listDealers,
  listProvinces,
  getMe,
  getResetTokenStatus,
  listAuditLogs,
  listUsers,
  login,
  logout,
  updateProfile,
  withQuery,
  type ApiFailure,
} from "./api";

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];
const fetchMock = vi.fn<(...args: FetchArgs) => Promise<Response>>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function lastCall(): { url: string; init: RequestInit; headers: Record<string, string> } {
  const call = fetchMock.mock.lastCall;
  if (call === undefined) throw new Error("No hubo llamada");
  const [input, init = {}] = call;
  // api.ts siempre pasa la ruta como texto.
  return { url: input as string, init, headers: init.headers as Record<string, string> };
}

const NETWORK: ApiFailure = { ok: false, kind: "NETWORK", status: 0 };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("peticiones", () => {
  it("GET: ruta relativa, mismo origen, Accept JSON y sin X-Requested-With", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { username: "jperez" }));

    expect(await getMe()).toEqual({ ok: true, data: { username: "jperez" } });

    const { url, init, headers } = lastCall();
    expect(url).toBe("/api/v1/backoffice/auth/me");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBeUndefined();
    expect(headers).toEqual({ Accept: "application/json" });
  });

  it("POST con cuerpo: X-Requested-With y JSON (sección 5.6)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { username: "jperez" }));

    await login({ username: "jperez", password: "Clave#2026" });

    const { url, init, headers } = lastCall();
    expect(url).toBe("/api/v1/backoffice/auth/login");
    expect(init.method).toBe("POST");
    expect(headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    });
    expect(JSON.parse(init.body as string)).toEqual({ username: "jperez", password: "Clave#2026" });
  });

  it("POST sin cuerpo también lleva X-Requested-With; 204 → ok sin datos", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    expect(await logout()).toEqual({ ok: true, data: undefined });

    const { headers, init } = lastCall();
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("codifica el token en la ruta", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { tokenStatus: "VALID" }));

    await getResetTokenStatus("a/b?c");

    expect(lastCall().url).toBe("/api/v1/backoffice/auth/password-reset/a%2Fb%3Fc");
  });
});

describe("errores", () => {
  it("error propio con field → code, detail, field y fieldErrors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        detail: "La contraseña actual no es correcta.",
        code: "CURRENT_PASSWORD_INVALID",
        field: "currentPassword",
      }),
    );

    expect(await changePassword({ currentPassword: "x", newPassword: "y" })).toEqual({
      ok: false,
      kind: "HTTP",
      status: 422,
      code: "CURRENT_PASSWORD_INVALID",
      detail: "La contraseña actual no es correcta.",
      field: "currentPassword",
      fieldErrors: { currentPassword: "La contraseña actual no es correcta." },
    });
  });

  it("error propio sin field (423)", async () => {
    const detail = "Tu usuario está bloqueado temporalmente por intentos fallidos. Inténtalo nuevamente en 15 minutos o comunícate con el Administrador.";
    fetchMock.mockResolvedValue(jsonResponse(423, { detail, code: "ACCOUNT_LOCKED" }));

    expect(await login({ username: "a", password: "b" })).toEqual({
      ok: false,
      kind: "HTTP",
      status: 423,
      code: "ACCOUNT_LOCKED",
      detail,
    });
  });

  it("422 de Pydantic → fieldErrors con el último elemento de loc (gana el primero)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        detail: [
          { type: "missing", loc: ["body", "username"], msg: "Campo obligatorio" },
          { type: "string_too_long", loc: ["body", "password"], msg: "Debe tener como máximo 20 caracteres" },
          { type: "other", loc: ["body", "password"], msg: "Segundo mensaje" },
          { type: "model_type", loc: ["body"], msg: "Debe ser un objeto JSON" },
          { loc: "no es una lista", msg: "ignorado" },
        ],
      }),
    );

    expect(await login({ username: "", password: "x".repeat(21) })).toEqual({
      ok: false,
      kind: "HTTP",
      status: 422,
      fieldErrors: {
        username: "Campo obligatorio",
        password: "Debe tener como máximo 20 caracteres",
        body: "Debe ser un objeto JSON",
      },
    });
  });

  it("error sin cuerpo JSON → HTTP sin detail", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502 }));

    expect(await getMe()).toEqual({ ok: false, kind: "HTTP", status: 502 });
  });

  it("red caída → NETWORK", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await getMe()).toEqual(NETWORK);
  });

  it("200 con un cuerpo que no es JSON → NETWORK", async () => {
    fetchMock.mockResolvedValue(new Response("no es json", { status: 200 }));

    expect(await getMe()).toEqual(NETWORK);
  });

  it("corta a los 15 s y lo trata como fallo de red", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    let settled = false;
    const result = getMe().finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(14_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await result).toEqual(NETWORK);
  });
});

describe("B7: usuarios, perfil y bitácora", () => {
  it("withQuery omite los vacíos y codifica los valores", () => {
    expect(withQuery("/users", { q: "pérez gómez", roleCode: undefined, status: null, page: 1, empty: "" })).toBe(
      "/users?q=p%C3%A9rez+g%C3%B3mez&page=1",
    );
    expect(withQuery("/users", {})).toBe("/users");
  });

  it("GET /users con filtros, orden y paginación en la query", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 20 }));
    await listUsers({ q: "perez", status: "BLOQUEADO", page: 2, pageSize: 50, sortBy: "username", sortOrder: "desc" });
    expect(lastCall().url).toBe("/api/v1/backoffice/users?q=perez&status=BLOQUEADO&page=2&pageSize=50&sortBy=username&sortOrder=desc");
  });

  it("GET /audit-logs con fechas y filtros", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 20 }));
    await listAuditLogs({ from: "2026-11-11", to: "2026-11-17", action: "USER_UPDATED", page: 1, pageSize: 20 });
    expect(lastCall().url).toBe("/api/v1/backoffice/audit-logs?from=2026-11-11&to=2026-11-17&action=USER_UPDATED&page=1&pageSize=20");
  });

  it("mutaciones: PATCH, POST sin cuerpo y DELETE llevan X-Requested-With; el id va codificado", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    await updateProfile({ firstNames: "Ana" });
    expect(lastCall().init.method).toBe("PATCH");
    expect(lastCall().headers["X-Requested-With"]).toBe("XMLHttpRequest");

    await activateUser("a/b");
    expect(lastCall().url).toBe("/api/v1/backoffice/users/a%2Fb/activate");
    expect(lastCall().init.method).toBe("POST");
    expect(lastCall().headers["X-Requested-With"]).toBe("XMLHttpRequest");

    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await deleteUser("6f0c")).toEqual({ ok: true, data: undefined });
    expect(lastCall().init.method).toBe("DELETE");
    expect(lastCall().headers["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("409 DUPLICATE con field → fieldErrors del campo", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { detail: "Ya existe un usuario con ese DNI.", code: "DUPLICATE", field: "dni" }));
    expect(await deleteUser("x")).toEqual({
      ok: false,
      kind: "HTTP",
      status: 409,
      code: "DUPLICATE",
      detail: "Ya existe un usuario con ese DNI.",
      field: "dni",
      fieldErrors: { dni: "Ya existe un usuario con ese DNI." },
    });
  });
});

describe("B8: dealers, ubigeo y exportación", () => {
  const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  it("GET /dealers con filtros de ubigeo, orden y paginación; provincias del departamento", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, pageSize: 20 }));
    await listDealers({ q: "abc", departmentCode: "15", page: 1, pageSize: 20, sortBy: "ruc", sortOrder: "asc" });
    expect(lastCall().url).toBe("/api/v1/backoffice/dealers?q=abc&departmentCode=15&page=1&pageSize=20&sortBy=ruc&sortOrder=asc");

    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await listProvinces("15");
    expect(lastCall().url).toBe("/api/v1/backoffice/ubigeo/departments/15/provinces");
  });

  it("exportación: mismos filtros sin paginación; devuelve el blob y el nombre de Content-Disposition", async () => {
    fetchMock.mockResolvedValue(
      new Response("PK", {
        status: 200,
        headers: { "Content-Type": XLSX, "Content-Disposition": 'attachment; filename="dealers_20261117_1030.xlsx"' },
      }),
    );
    const result = await exportDealers({ districtUbigeo: "150101", sortBy: "dealerCode", sortOrder: "desc" });

    const { url, init, headers } = lastCall();
    expect(url).toBe("/api/v1/backoffice/dealers/export?districtUbigeo=150101&sortBy=dealerCode&sortOrder=desc");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("same-origin");
    expect(headers.Accept).toBe(`${XLSX}, application/json`);
    if (!result.ok) throw new Error("debía ser ok");
    expect(result.data.filename).toBe("dealers_20261117_1030.xlsx");
    expect(await result.data.blob.text()).toBe("PK");
  });

  it("exportación con error: el cuerpo JSON de la API, como toda llamada", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { detail: "No tienes permiso para realizar esta acción.", code: "FORBIDDEN" }));
    expect(await exportDealers({ sortBy: "dealerCode", sortOrder: "asc" })).toMatchObject({
      ok: false,
      kind: "HTTP",
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("exportación: timeout de 60 s (D3), no de 15 s", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    let settled = false;
    const result = exportDealers({ sortBy: "dealerCode", sortOrder: "asc" }).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(59_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toEqual(NETWORK);
  });

  it.each([
    ['attachment; filename="dealers_20261117_1030.xlsx"', "dealers_20261117_1030.xlsx"],
    ["attachment; filename=dealers.xlsx", "dealers.xlsx"],
    ["attachment; filename*=UTF-8''dealers%20%C3%B1.xlsx", "dealers ñ.xlsx"],
    ['attachment; filename="../../etc/passwd"', "passwd"],
    ["attachment", null],
    [null, null],
  ])("filenameFromContentDisposition(%j) → %j", (header, expected) => {
    expect(filenameFromContentDisposition(header)).toBe(expected);
  });
});
