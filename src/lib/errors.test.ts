import { describe, expect, it } from "vitest";
import type { ApiFailure } from "./api";
import { ApiError, failureMessage, failureOf, NETWORK_ERROR_MESSAGE, unwrap } from "./errors";

const http = (status: number, extra: Partial<ApiFailure> = {}): ApiFailure => ({ ok: false, kind: "HTTP", status, ...extra });

describe("errores", () => {
  it("unwrap devuelve los datos o lanza ApiError con el fallo", () => {
    expect(unwrap({ ok: true, data: 1 })).toBe(1);
    const failure = http(423, { code: "ACCOUNT_LOCKED", detail: "Bloqueado" });
    expect(() => unwrap(failure)).toThrow(ApiError);
    try {
      unwrap(failure);
    } catch (error) {
      expect(failureOf(error)).toBe(failure);
    }
  });

  it("failureOf de un error cualquiera → fallo de red", () => {
    expect(failureOf(new Error("x"))).toEqual({ ok: false, kind: "NETWORK", status: 0 });
  });

  it("failureMessage: red, 5xx o sin detail → mensaje de conexión (Anexo A.1); si no, el detail", () => {
    expect(failureMessage({ ok: false, kind: "NETWORK", status: 0 })).toBe(NETWORK_ERROR_MESSAGE);
    expect(failureMessage(http(503, { detail: "Servicio no disponible" }))).toBe(NETWORK_ERROR_MESSAGE);
    expect(failureMessage(http(422))).toBe(NETWORK_ERROR_MESSAGE);
    expect(failureMessage(http(403, { detail: "Tu usuario está inactivo. Comunícate con el Administrador." }))).toBe(
      "Tu usuario está inactivo. Comunícate con el Administrador.",
    );
  });
});
