import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";

/**
 * Presentación común de 403 y 404 (spec de rediseño, 6.6): centrado, ícono decorativo en un círculo, el `h1` (el
 * mensaje del Anexo A.1) y la acción. `page` = título de página (con sesión); `public` = título de pantalla pública
 * (404 dentro de la tarjeta de `AuthLayout`), 3.3.
 */
export function StatusPage({
  icon: Icon,
  title,
  size,
  children,
}: {
  icon: LucideIcon;
  title: string;
  size: "page" | "public";
  children: ReactNode;
}) {
  return (
    <div className={cx("mx-auto flex max-w-md flex-col items-center gap-4 text-center", size === "page" && "py-12")}>
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-fg-muted">
        <Icon className="size-6" />
      </span>
      <h1
        className={cx(
          "font-display font-semibold tracking-tight text-fg",
          size === "page" ? "text-2xl" : "text-xl",
        )}
      >
        {title}
      </h1>
      <div className="mt-2">{children}</div>
    </div>
  );
}
