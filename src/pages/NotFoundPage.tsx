import { Link } from "react-router";
import { buttonClasses } from "../components/styles";
import { useDocumentTitle } from "../lib/useDocumentTitle";

/** 404 (`*`, Anexo A.1), con o sin sesión. Título del documento "Página no encontrada": propuesta aprobada en la sesión 4. */
export function NotFoundPage() {
  useDocumentTitle("Página no encontrada");
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="text-xl font-semibold text-fg">La página que buscas no existe.</h1>
      <Link to="/" className={buttonClasses()}>
        Ir al inicio
      </Link>
    </div>
  );
}
