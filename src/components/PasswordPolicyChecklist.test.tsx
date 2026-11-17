import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PasswordPolicy } from "../lib/api";
import { PasswordPolicyChecklist } from "./PasswordPolicyChecklist";

const POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 20,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
};

function items() {
  return screen.getAllByRole("listitem").map((item) => ({ text: item.textContent, state: item.dataset.state }));
}

describe("PasswordPolicyChecklist", () => {
  it("con el usuario: estado de cada requisito, también para lectores de pantalla", () => {
    render(
      <PasswordPolicyChecklist
        id="c"
        policy={POLICY}
        password="clave2026"
        personalData={{ username: "jperez", dni: "12345678" }}
      />,
    );

    expect(items()).toEqual([
      { text: "Al menos 8 caracteres (cumplido)", state: "met" },
      { text: "Como máximo 20 caracteres (cumplido)", state: "met" },
      { text: "Una letra mayúscula (pendiente)", state: "unmet" },
      { text: "Una letra minúscula (cumplido)", state: "met" },
      { text: "Un número (cumplido)", state: "met" },
      { text: "Un carácter especial (por ejemplo ! @ # $ %) (pendiente)", state: "unmet" },
      { text: "No debe contener tu usuario ni tu DNI (cumplido)", state: "met" },
    ]);
  });

  it("sin datos del usuario (Restablecer): el ítem de usuario/DNI queda neutral, sin estado (D2)", () => {
    render(<PasswordPolicyChecklist id="c" policy={POLICY} password="Clave#2026" />);

    expect(items().at(-1)).toEqual({ text: "No debe contener tu usuario ni tu DNI", state: "unknown" });
  });
});
