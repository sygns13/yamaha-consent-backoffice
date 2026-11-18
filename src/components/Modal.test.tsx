import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TemporaryPasswordModal } from "../features/users/TemporaryPasswordModal";
import { ConfirmDialog } from "./ConfirmDialog";

const MESSAGE = "¿Eliminar a jperez? Dejará de mostrarse y se cerrarán sus sesiones activas.";
const PASSWORD = "Xk7#mP2qR9vT!aHw4&Zc";

function ConfirmHarness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Eliminar jperez
      </button>
      <ConfirmDialog
        open={open}
        title="Eliminar"
        message={MESSAGE}
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe("ConfirmDialog (<dialog> nativo, sección 8.1)", () => {
  it("abre con showModal, enfoca Cancelar, describe el mensaje y devuelve el foco al cerrar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    const trigger = screen.getByRole("button", { name: "Eliminar jperez" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Eliminar" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription(MESSAGE);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Escape (evento cancel) cierra por el estado y el contenido sale del DOM", async () => {
    const user = userEvent.setup();
    render(<ConfirmHarness onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Eliminar jperez" }));
    const dialog = screen.getByRole("dialog", { name: "Eliminar" });

    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog).not.toHaveAttribute("open");
    expect(screen.queryByText(MESSAGE)).toBeNull();
  });

  it("confirmar llama a onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmHarness onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Eliminar jperez" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe("TemporaryPasswordModal (sección 8.6)", () => {
  it("solo se cierra con 'Entendido': Escape no, y si el navegador lo cierra igual, se vuelve a abrir", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TemporaryPasswordModal open username="jperez" password={PASSWORD} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Contraseña temporal" });
    expect(dialog).toHaveAttribute("closedby", "none");
    expect(screen.getByText("Usuario: jperez")).toBeInTheDocument();

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog).toHaveAttribute("open");
    (dialog as HTMLDialogElement).close();
    expect(dialog).toHaveAttribute("open");
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Entendido" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("'Copiar' escribe en el portapapeles y cambia a 'Copiada'", async () => {
    const user = userEvent.setup();
    render(<TemporaryPasswordModal open username="jperez" password={PASSWORD} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByRole("button", { name: "Copiada" })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(PASSWORD);
  });
});
