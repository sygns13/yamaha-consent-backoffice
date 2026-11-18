import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "./DataTable";

interface Row {
  id: string;
  code: string;
}

const COLUMNS: Column<Row>[] = [
  { key: "code", header: "Código", sortKey: "dealerCode", cell: (row) => row.code },
  { key: "id", header: "Id", cell: (row) => row.id },
];

describe("DataTable (sección 8.7)", () => {
  it("encabezados con scope, orden con aria-sort y región desplazable enfocable", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      <DataTable
        label="Dealers"
        columns={COLUMNS}
        rows={[{ id: "1", code: "CL0001" }]}
        rowKey={(row) => row.id}
        sort={{ sortBy: "dealerCode", sortOrder: "desc" }}
        onSort={onSort}
      />,
    );
    const region = screen.getByRole("region", { name: "Dealers" });
    expect(region).toHaveAttribute("tabindex", "0");
    const [code, id] = within(region).getAllByRole("columnheader");
    expect(code).toHaveAttribute("scope", "col");
    expect(code).toHaveAttribute("aria-sort", "descending");
    expect(id).not.toHaveAttribute("aria-sort");
    expect(within(id!).queryByRole("button")).toBeNull();

    await user.click(within(code!).getByRole("button", { name: "Código" }));
    expect(onSort).toHaveBeenCalledWith("dealerCode");
  });

  it("fila extra solo cuando renderExpanded devuelve contenido", () => {
    render(
      <DataTable
        label="Bitácora"
        columns={COLUMNS}
        rows={[
          { id: "1", code: "A" },
          { id: "2", code: "B" },
        ]}
        rowKey={(row) => row.id}
        renderExpanded={(row) => (row.id === "2" ? <pre>detalle</pre> : null)}
      />,
    );
    // Encabezado + 2 filas + 1 fila de detalle.
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("detalle").closest("td")).toHaveAttribute("colspan", "2");
  });
});
