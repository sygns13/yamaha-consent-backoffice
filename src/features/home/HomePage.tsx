import { Link } from "react-router";
import { isKnownModule, MODULES } from "../../app/modules";
import { useMe } from "../../auth/useMe";
import { PageHeader } from "../../components/PageHeader";
import { useDocumentTitle } from "../../lib/useDocumentTitle";

/** Inicio (sección 8.6): saludo y una tarjeta por módulo permitido (nombre de la API + descripción del Anexo A.2). */
export function HomePage() {
  useDocumentTitle("Inicio");
  const me = useMe();
  return (
    <>
      <PageHeader title={`Hola, ${me.firstNames}`} />
      <p className="-mt-3 mb-6 text-fg-muted">Selecciona un módulo para comenzar.</p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {me.modules.map(({ code, name }) =>
          isKnownModule(code) ? (
            <li key={code}>
              <Link
                to={MODULES[code].path}
                className="block h-full rounded-lg border border-border bg-surface p-5 shadow-sm hover:border-primary-text/40"
              >
                <span className="block text-lg font-semibold text-primary-text">{name}</span>
                <span className="mt-1 block text-sm text-fg-muted">{MODULES[code].description}</span>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </>
  );
}
