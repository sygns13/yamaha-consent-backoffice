import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changePassword, getMe, getResetTokenStatus, login, logout, type ApiFailure } from "./api";

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
