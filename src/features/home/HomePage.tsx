import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { isKnownModule, MODULES } from "../../app/modules";
import { useMe } from "../../auth/useMe";
import { PageHeader } from "../../components/PageHeader";
import { cx } from "../../lib/cx";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/**
 * Inicio (sección 8.6): saludo y una tarjeta por módulo permitido (nombre de la API + descripción del Anexo A.2).
 * Presentación de la spec de rediseño, 6.2: cada tarjeta es un solo enlace (nombre accesible = nombre + descripción),
 * con el ícono del módulo y una flecha decorativos. Son los únicos enlaces dentro de `<main>`.
 */
export function HomePage() {
  useDocumentTitle("Inicio");
  const me = useMe();
  return (
    <>
      <PageHeader title={`Hola, ${me.firstNames}`} description="Selecciona un módulo para comenzar." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {me.modules.map(({ code, name }) => {
          if (!isKnownModule(code)) return null;
          const { path, description, icon: Icon } = MODULES[code];
          return (
            <li key={code}>
              <Link
                to={path}
                className={cx(
                  "group flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-card dark:shadow-none",
                  "transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary-text/40 hover:shadow-popover",
                  "dark:hover:shadow-popover-dark motion-reduce:transition-none motion-reduce:transform-none",
                )}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary-text">
                    <Icon className="size-5" />
                  </span>
                  <ArrowRight
                    className={cx(
                      "size-4 shrink-0 text-fg-subtle transition duration-200 ease-out",
                      "group-hover:translate-x-0.5 group-hover:text-primary-text motion-reduce:transition-none motion-reduce:transform-none",
                    )}
                  />
                </span>
                <span>
                  <span className="block text-base font-semibold text-fg">{name}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
