import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS, SearchField } from "./SearchField";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("SearchField (debounce de 300 ms, sección 8.6)", () => {
  it("busca una sola vez, 300 ms después de la última tecla, sin espacios en los extremos", () => {
    const onSearch = vi.fn();
    render(<SearchField label="Buscar" value="" onSearch={onSearch} />);
    const input = screen.getByRole("searchbox", { name: "Buscar" });

    fireEvent.change(input, { target: { value: "pe" } });
    advance(SEARCH_DEBOUNCE_MS - 1);
    fireEvent.change(input, { target: { value: " perez " } });
    advance(SEARCH_DEBOUNCE_MS - 1);
    expect(onSearch).not.toHaveBeenCalled();
    advance(1);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith("perez");
  });

  it("si la búsqueda vigente cambia por fuera (Atrás), muestra ese valor y no vuelve a buscar", () => {
    const onSearch = vi.fn();
    const { rerender } = render(<SearchField label="Buscar" value="perez" onSearch={onSearch} />);
    rerender(<SearchField label="Buscar" value="" onSearch={onSearch} />);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    advance(SEARCH_DEBOUNCE_MS * 2);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("un espacio final escrito no se borra cuando la URL recibe el texto recortado", () => {
    const onSearch = vi.fn();
    const { rerender } = render(<SearchField label="Buscar" value="" onSearch={onSearch} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "juan " } });
    advance(SEARCH_DEBOUNCE_MS);
    expect(onSearch).toHaveBeenCalledWith("juan");
    rerender(<SearchField label="Buscar" value="juan" onSearch={onSearch} />);
    expect(screen.getByRole("searchbox")).toHaveValue("juan ");
  });
});
