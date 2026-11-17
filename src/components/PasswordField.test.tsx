import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("muestra y oculta la contraseña (Anexo A.2)", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Contraseña" />);
    const input = screen.getByLabelText("Contraseña");

    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("error: aria-invalid y aria-describedby con el mensaje y las descripciones extra", () => {
    render(
      <>
        <PasswordField label="Nueva contraseña" error="Campo obligatorio" describedBy="checklist" />
        <ul id="checklist">
          <li>Al menos 8 caracteres</li>
        </ul>
      </>,
    );
    const input = screen.getByLabelText("Nueva contraseña");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Al menos 8 caracteres Campo obligatorio");
  });
});
