import { describe, expect, it } from "vitest";
import { loginPath, safeNext } from "./navigation";

describe("safeNext (sección 8.4: sin redirecciones abiertas)", () => {
  it.each(["/", "/usuarios", "/dealers/123/editar?x=1#y", "/auditoria?from=2026-11-01"])("acepta %s", (value) => {
    expect(safeNext(value)).toBe(value);
  });

  it.each([
    null,
    undefined,
    "",
    "usuarios",
    "//malicioso.com",
    "//malicioso.com/login",
    "/\\malicioso.com",
    "https://malicioso.com",
    "javascript:void(0)",
  ])("rechaza %s", (value) => {
    expect(safeNext(value)).toBeNull();
  });
});

describe("loginPath", () => {
  it("sin sesión → next", () => {
    expect(loginPath("none", "/usuarios?page=2")).toBe("/login?next=%2Fusuarios%3Fpage%3D2");
  });

  it("sesión vencida → motivo y next (sección 8.2)", () => {
    expect(loginPath("expired", "/cambiar-contrasena")).toBe(
      "/login?motivo=sesion-expirada&next=%2Fcambiar-contrasena",
    );
  });

  it("Inicio o un next inválido no se agregan", () => {
    expect(loginPath("none", "/")).toBe("/login");
    expect(loginPath("none", "//malicioso.com")).toBe("/login");
    expect(loginPath("expired", "/")).toBe("/login?motivo=sesion-expirada");
  });

  it("cierre de sesión → /login sin parámetros (sección 8.3)", () => {
    expect(loginPath("logout", "/usuarios")).toBe("/login");
  });
});
