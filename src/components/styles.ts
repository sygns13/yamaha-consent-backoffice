import { cx } from "../lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

// Spec de rediseño, 3.5 y 3.6: transición breve de color, fondo, borde, sombra y transformaciones (la utilidad
// `transition`, que no anima medidas), ninguna con movimiento reducido. `not-disabled:hover:` en lugar de
// `enabled:hover:`: también lo cumplen los enlaces con aspecto de botón (`:enabled` solo existe en controles de
// formulario).
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-semibold whitespace-nowrap " +
  "transition duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 " +
  "motion-reduce:transition-none motion-reduce:transform-none";

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "h-10 px-4 pointer-coarse:h-11",
  sm: "h-8 px-3",
};

// El borde transparente de primary, ghost y danger hace visible el botón en `forced-colors` (3.6, 8).
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-primary text-on-primary shadow-xs not-disabled:hover:bg-primary-hover",
  secondary: "border-border bg-surface text-fg shadow-xs not-disabled:hover:bg-surface-muted",
  ghost: "border-transparent text-fg-muted not-disabled:hover:bg-surface-muted not-disabled:hover:text-fg",
  danger: "border-transparent bg-danger-fill text-on-danger shadow-xs not-disabled:hover:bg-danger-fill-hover",
};

/**
 * Acción de una fila de tabla o del encabezado de un detalle (Ver, Editar, Eliminar...): 32 px de alto (WCAG 2.2,
 * 2.5.8), sin subrayado. Los `<Link>` que la usan siguen siendo enlaces.
 */
export function actionClasses(tone: "default" | "danger" = "default"): string {
  return cx(
    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap",
    "transition duration-150 ease-out motion-reduce:transition-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    tone === "danger"
      ? "text-danger not-disabled:hover:bg-danger-surface"
      : "text-fg-muted not-disabled:hover:bg-surface-muted not-disabled:hover:text-fg",
  );
}

/** Clases de botón, también para enlaces con aspecto de botón ("Ir al inicio"). */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string, size: ButtonSize = "md"): string {
  return cx(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className);
}

/** Enlace dentro de un texto: siempre subrayado (WCAG 1.4.1). */
export const LINK_CLASSES =
  "font-medium text-primary-text underline decoration-primary-text/40 underline-offset-4 transition duration-150 " +
  "ease-out hover:decoration-primary-text motion-reduce:transition-none";

const INPUT_BASE =
  "block rounded-lg border border-border-strong bg-surface px-3 text-base text-fg shadow-xs " +
  "transition duration-150 ease-out placeholder:text-fg-subtle sm:text-sm focus-visible:outline-offset-0 " +
  "aria-[invalid=true]:border-danger disabled:bg-surface-muted disabled:text-fg-muted motion-reduce:transition-none";

/** Inputs y selects: 40 px (44 px en pantallas táctiles); 16 px de texto en móvil evita el zoom de iOS. */
export const INPUT_CLASSES = `${INPUT_BASE} h-10 w-full pointer-coarse:h-11`;

/** Variante compacta, de ancho según el contenido (select de "Filas por página"). */
export const INPUT_COMPACT_CLASSES = `${INPUT_BASE} h-8`;
