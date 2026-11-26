import { House, ShieldX } from "lucide-react";
import { Link } from "react-router";
import { buttonClasses } from "../components/styles";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { StatusPage } from "./StatusPage";

/** 403 (`/sin-permiso`, Anexo A.1). Título del documento "Sin permiso": propuesta aprobada en la sesión 4. */
export function ForbiddenPage() {
  useDocumentTitle("Sin permiso");
  return (
    <StatusPage icon={ShieldX} title="No tienes permiso para ver esta página." size="page">
      <Link to="/" className={buttonClasses()}>
        <House className="size-4 shrink-0" />
        Ir al inicio
      </Link>
    </StatusPage>
  );
}
