import { Link } from "react-router";
import { buttonClasses } from "../components/styles";
import { useDocumentTitle } from "../lib/useDocumentTitle";

/** 403 (`/sin-permiso`, Anexo A.1). Título del documento "Sin permiso": propuesta aprobada en la sesión 4. */
export function ForbiddenPage() {
  useDocumentTitle("Sin permiso");
  return (
    <div className="flex flex-col items-start gap-6">
      <h1 className="text-2xl font-semibold text-fg">No tienes permiso para ver esta página.</h1>
      <Link to="/" className={buttonClasses()}>
        Ir al inicio
      </Link>
    </div>
  );
}
