import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `globals` de Vitest, Testing Library no limpia sola el DOM entre tests.
afterEach(() => cleanup());

// jsdom no implementa `showModal()` ni `close()` de <dialog>: lo mínimo para probar Modal y ConfirmDialog.
const dialogPrototype = HTMLDialogElement.prototype as Partial<Pick<HTMLDialogElement, "showModal" | "close">>;
if (typeof dialogPrototype.showModal !== "function") {
  dialogPrototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  dialogPrototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
