import { describe, expect, it } from "vitest";
import { initials } from "./format";

// Spec de rediseño, 4.21 y 9.3: helper visual del avatar.
describe("initials", () => {
  it.each([
    [{ firstNames: "Juan", lastNames: "Pérez Gómez" }, "JP"],
    // Nombres compuestos: solo la primera letra de cada parte.
    [{ firstNames: "María José", lastNames: "de la Cruz" }, "MD"],
    // Ñ y tildes, en mayúsculas.
    [{ firstNames: "ñuflo", lastNames: "ñañez" }, "ÑÑ"],
    [{ firstNames: "Ángel", lastNames: "Óscar" }, "ÁÓ"],
    [{ firstNames: "émile", lastNames: "úrsula" }, "ÉÚ"],
    // Espacios en los extremos.
    [{ firstNames: "  Olga ", lastNames: " Ramírez Soto" }, "OR"],
  ])("%o → %s", (person, expected) => {
    expect(initials(person)).toBe(expected);
  });

  it("una tilde escrita como carácter combinado (NFD) queda con su letra", () => {
    expect(initials({ firstNames: "Álvaro", lastNames: "Ñañez" })).toBe("ÁÑ");
  });

  it("cuenta puntos de código, no unidades UTF-16", () => {
    expect(initials({ firstNames: "𝒜na", lastNames: "Ruiz" })).toBe("𝒜R");
  });

  it("sin datos, vacío", () => {
    expect(initials({ firstNames: "", lastNames: " " })).toBe("");
  });
});
