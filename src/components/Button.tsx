import type { ComponentProps } from "react";
import { buttonClasses, type ButtonVariant } from "./styles";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  /** Mientras carga: deshabilitado, `aria-busy` y, si se da, `loadingText` en lugar del texto (p. ej. "Ingresando..."). */
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, className)}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
