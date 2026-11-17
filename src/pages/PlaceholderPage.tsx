import { PageHeader } from "../components/PageHeader";
import { useDocumentTitle } from "../lib/useDocumentTitle";

/**
 * Página provisional de las rutas de B7 y B8 (Mi perfil, Dealers, Usuarios, Bitácora): solo el título del Anexo A.2.
 * Existe para que las guardas, el menú y las tarjetas de Inicio ya funcionen en B6 (decisión de la sesión 4).
 * B7 y B8 la reemplazan por las pantallas reales.
 */
export function PlaceholderPage({ title }: { title: string }) {
  useDocumentTitle(title);
  return <PageHeader title={title} />;
}
