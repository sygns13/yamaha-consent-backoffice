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

const VARIANTS: Record<ToastVariant, string> = {
  success: "border-success bg-success-surface text-success",
  error: "border-danger bg-danger-surface text-danger",
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
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              "pointer-events-auto w-full max-w-md rounded-md border-l-4 px-4 py-3 text-sm shadow-md",
              VARIANTS[toast.variant],
            )}
          >
            {toast.message}
          </div>
        ))}
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
