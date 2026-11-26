import { Moon, Sun } from "lucide-react";
import { cx } from "../lib/cx";
import { setTheme, useTheme } from "../lib/theme";

/**
 * Botón de tema de la cabecera (spec de rediseño v1.3, 5.2; pedido del responsable el 26/11/2026): alterna entre
 * claro y oscuro y lo recuerda en este navegador. El nombre accesible dice a qué tema cambia (Anexo A); el ícono
 * muestra ese tema (luna → oscuro, sol → claro).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Cambiar a tema oscuro" : "Cambiar a tema claro";
  const Icon = next === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cx(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-fg-muted",
        "transition duration-150 ease-out hover:bg-surface-muted hover:text-fg active:translate-y-px",
        "motion-reduce:transition-none motion-reduce:transform-none",
        className,
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
