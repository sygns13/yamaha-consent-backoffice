/**
 * Sufijo solo para lectores de pantalla en las acciones de una fila: "Editar" + " jperez" (aprobado en el spec v1.5).
 * El nombre accesible contiene el texto visible (WCAG 2.5.3).
 */
export function RecordName({ name }: { name: string }) {
  return <span className="sr-only"> {name}</span>;
}
