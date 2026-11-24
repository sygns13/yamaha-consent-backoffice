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

// jsdom no implementa la Popover API (RowActionsMenu, spec de rediseño 4.23): lo mínimo para probarlo. Abrir y cerrar
// disparan `toggle` con `oldState`/`newState`, y un clic en un botón con `popovertarget` alterna su popover. Escape y el
// clic afuera (light dismiss) se prueban en el navegador (e2e).
type PopoverMethods = Pick<HTMLElement, "showPopover" | "hidePopover" | "togglePopover">;
const popoverPrototype = HTMLElement.prototype as Partial<PopoverMethods>;
if (typeof popoverPrototype.showPopover !== "function") {
  const openPopovers = new WeakSet<HTMLElement>();
  const toggle = (element: HTMLElement, oldState: string, newState: string) =>
    element.dispatchEvent(Object.assign(new Event("toggle"), { oldState, newState }));
  // jsdom oculta `[popover]` con su hoja de estilos de agente y no conoce `:popover-open`: se muestra a mano.
  popoverPrototype.showPopover = function showPopover(this: HTMLElement) {
    if (openPopovers.has(this)) return;
    openPopovers.add(this);
    this.style.setProperty("display", "block");
    toggle(this, "closed", "open");
  };
  popoverPrototype.hidePopover = function hidePopover(this: HTMLElement) {
    if (!openPopovers.delete(this)) return;
    this.style.removeProperty("display");
    toggle(this, "open", "closed");
  };
  popoverPrototype.togglePopover = function togglePopover(this: HTMLElement, force?: boolean | TogglePopoverOptions) {
    const show = typeof force === "boolean" ? force : !openPopovers.has(this);
    if (show) this.showPopover();
    else this.hidePopover();
    return show;
  };
  document.addEventListener("click", (event) => {
    const invoker = event.target instanceof Element ? event.target.closest("button[popovertarget]") : null;
    const targetId = invoker?.getAttribute("popovertarget");
    const target = targetId ? document.getElementById(targetId) : null;
    target?.togglePopover();
  });
}
