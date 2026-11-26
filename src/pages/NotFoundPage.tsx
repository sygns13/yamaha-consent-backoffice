import { Compass, House } from "lucide-react";
import { Link } from "react-router";
import { buttonClasses } from "../components/styles";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { StatusPage } from "./StatusPage";

/** 404 (`*`, Anexo A.1), con o sin sesión. Título del documento "Página no encontrada": propuesta aprobada en la sesión 4. */
export function NotFoundPage() {
  useDocumentTitle("Página no encontrada");
  return (
    <StatusPage icon={Compass} title="La página que buscas no existe." size="public">
      <Link to="/" className={buttonClasses()}>
        <House className="size-4 shrink-0" />
        Ir al inicio
      </Link>
    </StatusPage>
  );
}
