import { CircleCheck, CircleExclamationPoint, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "../lib/cx";

export type ToastVariant = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastApi {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_DURATION_MS = 6_000;

// Spec de rediseño, 4.6: tarjeta neutra con ícono de color; la variante no depende solo del color (el ícono cambia).
const VARIANTS: Record<ToastVariant, { icon: LucideIcon; classes: string }> = {
  success: { icon: CircleCheck, classes: "text-success" },
  error: { icon: CircleExclamationPoint, classes: "text-danger" },
};

/**
 * Avisos breves (sección 8.1: en lugar de los diálogos nativos). Viven por encima del router, así sobreviven a la navegación
 * (p. ej. "Tu contraseña fue actualizada." al volver a Inicio). La región viva está siempre montada.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), TOAST_DURATION_MS);
  }, []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        role="status"
        // Abajo al centro en móvil; abajo a la derecha desde `sm`.
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end"
      >
        {toasts.map((toast) => {
          const { icon: Icon, classes } = VARIANTS[toast.variant];
          return (
            <div
              key={toast.id}
              className={cx(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-border bg-surface-raised",
                "px-4 py-3 text-sm text-fg shadow-popover dark:shadow-popover-dark",
                // Entrada (3.5): opacidad y desplazamiento con @starting-style, sin JavaScript de animación.
                "transition duration-200 ease-out starting:translate-y-1 starting:opacity-0",
                "motion-reduce:transition-none motion-reduce:transform-none",
              )}
            >
              <Icon className={cx("mt-0.5 size-4 shrink-0", classes)} />
              <span className="min-w-0 flex-1">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- el hook va junto a su proveedor.
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error("useToast() requiere ToastProvider.");
  return api;
}
