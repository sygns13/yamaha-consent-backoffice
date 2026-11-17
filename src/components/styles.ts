import { cx } from "../lib/cx";

export type ButtonVariant = "primary" | "secondary";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-surface",
};

/** Clases de botón, también para enlaces con aspecto de botón ("Ir al inicio"). */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], className);
}

/** Enlace de texto. */
export const LINK_CLASSES = "font-medium text-brand underline underline-offset-2 hover:text-brand-dark";

export const INPUT_CLASSES =
  "block w-full min-h-11 rounded-md border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 " +
  "aria-[invalid=true]:border-danger";
