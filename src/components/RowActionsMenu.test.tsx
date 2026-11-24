import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyRound, Trash, UserX } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { RowActionsMenu, type RowAction } from "./RowActionsMenu";

// Spec de rediseño, 4.23 y 9.3. jsdom no trae la Popover API: src/test/setup.ts agrega lo mínimo.

/**
 * Nombre accesible "<acción> <registro>". dom-accessibility-api (jsdom) recorta el texto de cada elemento hijo, así que
 * el espacio inicial del sufijo `sr-only` de RecordName se pierde solo aquí; en el navegador el nombre es
 * "Más acciones jperez" (e2e).
 */
const named = (action: string, record: string) => new RegExp(`^${action} ?${record}$`);

function actions(overrides: Partial<Record<"deactivate" | "reset" | "remove", () => void>> = {}): RowAction[] {
  return [
    { key: "deactivate", label: "Desactivar", icon: UserX, onSelect: overrides.deactivate ?? vi.fn() },
    { key: "reset", label: "Generar contraseña temporal", icon: KeyRound, onSelect: overrides.reset ?? vi.fn() },
    { key: "remove", label: "Eliminar", icon: Trash, tone: "danger", onSelect: overrides.remove ?? vi.fn() },
  ];
}

describe("RowActionsMenu (spec de rediseño, 4.23)", () => {
  it("sin ítems no dibuja nada", () => {
    const { container } = render(<RowActionsMenu name="jperez" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disparador 'Más acciones {registro}' que abre el panel con el foco en el primer ítem", async () => {
    const user = userEvent.setup();
    render(<RowActionsMenu name="jperez" items={actions()} />);
    const trigger = screen.getByRole("button", { name: named("Más acciones", "jperez") });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: named("Desactivar", "jperez") })).toHaveFocus();
  });

  it("panel popover con los mismos nombres accesibles de hoy y Eliminar al final", async () => {
    const user = userEvent.setup();
    render(<RowActionsMenu name="jperez" items={actions()} />);
    const trigger = screen.getByRole("button", { name: named("Más acciones", "jperez") });
    const panelId = trigger.getAttribute("popovertarget");
    const panel = document.getElementById(panelId ?? "");
    expect(panel).toHaveAttribute("popover", "auto");

    await user.click(trigger);
    expect(within(panel!).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Desactivar jperez",
      "Generar contraseña temporal jperez",
      "Eliminar jperez",
    ]);
    // Los destructivos van tras un divisor, en su propia lista.
    expect(within(panel!).getAllByRole("list")).toHaveLength(2);
  });

  it("elegir: foco al disparador, cierre y luego onSelect", async () => {
    const user = userEvent.setup();
    let focusedOnSelect: Element | null = null;
    const remove = vi.fn(() => {
      focusedOnSelect = document.activeElement;
    });
    render(<RowActionsMenu name="jperez" items={actions({ remove })} />);
    const trigger = screen.getByRole("button", { name: named("Más acciones", "jperez") });
    const panel = document.getElementById(trigger.getAttribute("popovertarget") ?? "")!;
    const hide = vi.spyOn(panel, "hidePopover");

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: named("Eliminar", "jperez") }));
    expect(remove).toHaveBeenCalledTimes(1);
    // (1) foco al disparador, (2) cerrar, (3) onSelect.
    expect(focusedOnSelect).toBe(trigger);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(hide.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]!);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("deshabilitado mientras hay una acción en curso para la fila", () => {
    render(<RowActionsMenu name="CL0001" items={actions()} disabled />);
    expect(screen.getByRole("button", { name: named("Más acciones", "CL0001") })).toBeDisabled();
  });
});
