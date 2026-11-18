import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination (Anexo A.1 y textos aprobados en el spec v1.5)", () => {
  it("rango, página y botones", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);

    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(nav).toHaveTextContent("Mostrando 21–40 de 45");
    expect(nav).toHaveTextContent("Página 2 de 3");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.selectOptions(screen.getByLabelText("Filas por página"), "50");
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("primera y última página deshabilitan Anterior y Siguiente", () => {
    const { rerender } = render(
      <Pagination page={1} pageSize={20} total={45} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    rerender(<Pagination page={3} pageSize={20} total={45} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.getByRole("navigation")).toHaveTextContent("Mostrando 41–45 de 45");
  });
});
