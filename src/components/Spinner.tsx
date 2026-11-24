import { LoaderCircle } from "lucide-react";
import { cx } from "../lib/cx";

/**
 * Indicador giratorio decorativo: el texto ("Cargando...") lo pone quien lo usa. Sigue girando con movimiento
 * reducido: es un indicador esencial (spec de rediseño, 3.5).
 */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx("size-5 shrink-0 animate-spin text-primary-text", className)} />;
}
