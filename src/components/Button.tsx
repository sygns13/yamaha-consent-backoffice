import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./styles";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícono de lucide antes del texto (decorativo: el texto da el nombre accesible). */
  icon?: LucideIcon;
  /** Mientras carga: deshabilitado, `aria-busy` y, si se da, `loadingText` en lugar del texto (p. ej. "Ingresando..."). */
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
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
      className={buttonClasses(variant, className, size)}
      {...props}
    >
      {/* Al cargar, el spinner ocupa el lugar del ícono (3.6): el botón no cambia de alto. */}
      {loading ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin" />
      ) : (
        Icon && <Icon className="size-4 shrink-0" />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
