import { render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./Button";

// Spec de rediseño, 3.8, 4.2, 4.21 y 9.3.
describe("BrandLogo (spec de rediseño, 3.8)", () => {
  it("alt 'Yamaha', fuente clara por defecto y oscura con prefers-color-scheme: dark", () => {
    const { container } = render(<BrandLogo className="h-8" />);
    const logo = screen.getByRole("img", { name: "Yamaha" });
    expect(logo.getAttribute("src")).toMatch(/yamaha-logo-light/);
    expect(logo).toHaveAttribute("width", "253");
    expect(logo).toHaveAttribute("height", "88");
    const source = container.querySelector("picture > source");
    expect(source).toHaveAttribute("media", "(prefers-color-scheme: dark)");
    expect(source?.getAttribute("srcset")).toMatch(/yamaha-logo-dark/);
  });

  it("variante inversa: solo la imagen de textos blancos", () => {
    const { container } = render(<BrandLogo variant="inverse" />);
    expect(screen.getByRole("img", { name: "Yamaha" }).getAttribute("src")).toMatch(/yamaha-logo-inverse/);
    expect(container.querySelector("picture")).toBeNull();
  });
});

describe("íconos decorativos (spec de rediseño, 3.7)", () => {
  it("Button con icon: el svg lleva aria-hidden y el texto da el nombre", () => {
    render(<Button icon={Plus}>Nuevo dealer</Button>);
    const button = screen.getByRole("button", { name: "Nuevo dealer" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("Button cargando: spinner en lugar del ícono, loadingText y aria-busy", () => {
    render(
      <Button icon={Plus} loading loadingText="Exportando...">
        Exportar a Excel
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Exportando..." });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    const icons = button.querySelectorAll("svg");
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveClass("animate-spin");
    expect(icons[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("Avatar: iniciales ocultas para lectores de pantalla", () => {
    const { container } = render(<Avatar person={{ firstNames: "Juan", lastNames: "Pérez Gómez" }} />);
    expect(container.firstElementChild).toHaveTextContent("JP");
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
