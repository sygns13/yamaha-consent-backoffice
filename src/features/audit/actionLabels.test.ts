import { describe, expect, it } from "vitest";
import { actionLabel, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, entityType } from "./actionLabels";

describe("etiquetas de la bitácora (Anexo A.5)", () => {
  it("las 20 acciones de la sección 5.10, en el orden del anexo", () => {
    expect(AUDIT_ACTIONS).toHaveLength(20);
    expect(AUDIT_ACTIONS[0]).toBe("AUTH_LOGIN_SUCCEEDED");
    expect(AUDIT_ACTIONS.at(-1)).toBe("SYSTEM_PURGE");
    expect(actionLabel("USER_PASSWORD_RESET_BY_ADMIN")).toBe("Contraseña temporal generada");
  });

  it("una acción desconocida se muestra tal cual (la API devuelve texto)", () => {
    expect(actionLabel("NUEVA_ACCION")).toBe("NUEVA_ACCION");
  });

  it("tipos de entidad con su etiqueta y la ruta del detalle (D2)", () => {
    expect(AUDIT_ENTITY_TYPES).toEqual(["USER", "DEALER"]);
    expect(entityType("USER")).toEqual({ label: "Usuario", path: "/usuarios" });
    expect(entityType("DEALER")).toEqual({ label: "Dealer", path: "/dealers" });
    expect(entityType("OTRO")).toBeNull();
    expect(entityType(null)).toBeNull();
  });
});
