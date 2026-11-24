import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailSkeleton, Skeleton, TableSkeleton } from "./Skeleton";

// Spec de rediseño, 4.10 y 9.3: región `status` con "Cargando..." y barras ocultas para lectores de pantalla.
describe("Skeleton (spec de rediseño, 4.10)", () => {
  it("la barra es decorativa", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("TableSkeleton: status 'Cargando...' y la tabla visible oculta", () => {
    render(<TableSkeleton label="Dealers" columns={["Código", "Razón social", "Acciones"]} rows={3} />);
    const status = screen.getByRole("status", { name: "Dealers" });
    expect(status).toHaveTextContent("Cargando...");
    // Solo "Cargando...": encabezados y barras no llegan a los lectores de pantalla.
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("columnheader")).toBeNull();
    expect(status.querySelectorAll("tbody tr")).toHaveLength(3);
  });

  it("DetailSkeleton: status 'Cargando...'", () => {
    render(<DetailSkeleton items={4} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando...");
  });
});
