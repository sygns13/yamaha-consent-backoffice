import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient, handleGlobalError } from "../app/queryClient";
import type { Me } from "../lib/api";
import { ApiError } from "../lib/errors";
import { fetchSession, ME_QUERY_KEY, type SessionState } from "./session";

const ME: Me = {
  id: "6f0c0000-0000-4000-8000-000000000001",
  username: "jperez",
  firstNames: "Juan",
  lastNames: "Pérez Gómez",
  dni: "12345678",
  email: "jperez@dominio.com",
  phone: null,
  role: { code: "ADMIN", name: "Administrador" },
  modules: [{ code: "DEALERS", name: "Gestión de Dealers" }],
  mustChangePassword: false,
  lastLoginAt: null,
  sessionExpiresAt: "2026-11-15T22:35:00-05:00",
};

const fetchMock = vi.fn<() => Promise<Response>>();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const session = (client: QueryClient) => client.getQueryData<SessionState>(ME_QUERY_KEY);
const authenticated = (me: Me = ME): SessionState => ({ status: "authenticated", me });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("fetchSession (GET /auth/me)", () => {
  it("200 → con sesión", async () => {
    respond(200, ME);
    expect(await fetchSession(new QueryClient())).toEqual(authenticated());
  });

  it("401 AUTH_REQUIRED sin sesión previa → sin sesión, motivo none", async () => {
    respond(401, { detail: "Debes iniciar sesión.", code: "AUTH_REQUIRED" });
    expect(await fetchSession(new QueryClient())).toEqual({ status: "anonymous", reason: "none" });
  });

  it("401 SESSION_EXPIRED → sesión vencida (había cookie)", async () => {
    respond(401, { detail: "Tu sesión expiró. Inicia sesión nuevamente.", code: "SESSION_EXPIRED" });
    expect(await fetchSession(new QueryClient())).toEqual({ status: "anonymous", reason: "expired" });
  });

  it("401 cuando antes había sesión en la pestaña → sesión vencida", async () => {
    const client = new QueryClient();
    client.setQueryData(ME_QUERY_KEY, authenticated());
    respond(401, { detail: "Debes iniciar sesión.", code: "AUTH_REQUIRED" });
    expect(await fetchSession(client)).toEqual({ status: "anonymous", reason: "expired" });
  });

  it("red o 5xx → lanza ApiError (la pantalla ofrece Reintentar)", async () => {
    respond(500, { detail: "Error interno" });
    await expect(fetchSession(new QueryClient())).rejects.toBeInstanceOf(ApiError);
  });
});

describe("manejo global (sección 8.2)", () => {
  const unauthorized = new ApiError({ ok: false, kind: "HTTP", status: 401, code: "SESSION_EXPIRED", detail: "x" });
  const passwordChange = new ApiError({ ok: false, kind: "HTTP", status: 403, code: "PASSWORD_CHANGE_REQUIRED", detail: "x" });

  it("401 → sesión vencida", () => {
    const client = new QueryClient();
    client.setQueryData(ME_QUERY_KEY, authenticated());
    handleGlobalError(client, unauthorized, undefined);
    expect(session(client)).toEqual({ status: "anonymous", reason: "expired" });
  });

  it("el login ignora su 401 (credenciales incorrectas)", () => {
    const client = new QueryClient();
    handleGlobalError(client, unauthorized, { ignoreAuthErrors: true });
    expect(session(client)).toBeUndefined();
  });

  it("403 PASSWORD_CHANGE_REQUIRED → mustChangePassword en la caché", () => {
    const client = new QueryClient();
    client.setQueryData(ME_QUERY_KEY, authenticated());
    handleGlobalError(client, passwordChange, undefined);
    expect(session(client)).toEqual(authenticated({ ...ME, mustChangePassword: true }));
  });

  it.each([
    new ApiError({ ok: false, kind: "HTTP", status: 403, code: "FORBIDDEN", detail: "x" }),
    new ApiError({ ok: false, kind: "NETWORK", status: 0 }),
    new Error("otro"),
  ])("otros errores no tocan la sesión (%o)", (error) => {
    const client = new QueryClient();
    client.setQueryData(ME_QUERY_KEY, authenticated());
    handleGlobalError(client, error, undefined);
    expect(session(client)).toEqual(authenticated());
  });

  it("createQueryClient lo aplica a consultas y mutaciones", async () => {
    const client = createQueryClient();
    client.setQueryData(ME_QUERY_KEY, authenticated());

    await client
      .fetchQuery({ queryKey: ["usuarios"], queryFn: () => Promise.reject(passwordChange) })
      .catch(() => undefined);
    expect(session(client)).toEqual(authenticated({ ...ME, mustChangePassword: true }));

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(unauthorized) })
      .execute(undefined)
      .catch(() => undefined);
    expect(session(client)).toEqual({ status: "anonymous", reason: "expired" });
  });
});
