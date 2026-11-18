import { describe, expect, it } from "vitest";
import { nextSort, pageCount, readEnum, readPage, readPageSize, readSort, readText } from "./listParams";

const params = (query: string) => new URLSearchParams(query);

describe("lectura de la URL de las listas (sección 6.1)", () => {
  it("texto con trim; ausente → vacío", () => {
    expect(readText(params("q=%20perez%20"), "q")).toBe("perez");
    expect(readText(params(""), "q")).toBe("");
  });

  it("enum: un valor desconocido se ignora", () => {
    expect(readEnum(params("status=ACTIVO"), "status", ["ACTIVO", "INACTIVO"] as const)).toBe("ACTIVO");
    expect(readEnum(params("status=otro"), "status", ["ACTIVO", "INACTIVO"] as const)).toBeUndefined();
  });

  it.each([
    ["", 1],
    ["page=3", 3],
    ["page=0", 1],
    ["page=-2", 1],
    ["page=1.5", 1],
    ["page=abc", 1],
  ])("página %j → %d", (query, expected) => {
    expect(readPage(params(query))).toBe(expected);
  });

  it.each([
    ["", 20],
    ["pageSize=10", 10],
    ["pageSize=100", 100],
    ["pageSize=30", 20],
    ["pageSize=1000", 20],
  ])("filas por página %j → %d (10, 20, 50 o 100)", (query, expected) => {
    expect(readPageSize(params(query))).toBe(expected);
  });

  it("orden: columna y sentido válidos o los de por defecto", () => {
    const sorts = ["dealerCode", "ruc"] as const;
    expect(readSort(params("sortBy=ruc&sortOrder=desc"), sorts, "dealerCode")).toEqual({ sortBy: "ruc", sortOrder: "desc" });
    expect(readSort(params("sortBy=otro&sortOrder=x"), sorts, "dealerCode")).toEqual({ sortBy: "dealerCode", sortOrder: "asc" });
  });

  it("nextSort: la misma columna invierte; otra empieza ascendente", () => {
    expect(nextSort({ sortBy: "ruc", sortOrder: "asc" }, "ruc")).toEqual({ sortBy: "ruc", sortOrder: "desc" });
    expect(nextSort({ sortBy: "ruc", sortOrder: "desc" }, "ruc")).toEqual({ sortBy: "ruc", sortOrder: "asc" });
    expect(nextSort({ sortBy: "ruc", sortOrder: "desc" }, "dealerCode")).toEqual({ sortBy: "dealerCode", sortOrder: "asc" });
  });

  it("pageCount: al menos 1", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(45, 20)).toBe(3);
    expect(pageCount(40, 20)).toBe(2);
  });
});
