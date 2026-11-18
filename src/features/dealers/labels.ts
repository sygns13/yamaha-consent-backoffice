import type { DealerDetail } from "../../lib/api";

/** Título del documento y de la página de detalle (aprobado en el spec v1.5, T4). */
export const DEALER_DETAIL_TITLE = "Detalle del dealer";

/** Texto de la API para `404 NOT_FOUND` de un dealer (Anexo A.3); también para un id mal formado en la URL. */
export const DEALER_NOT_FOUND = "No existe el dealer.";

/** "Ubicación" del detalle (sección 8.6): "Distrito, Provincia, Departamento (Ubigeo)". */
export function dealerLocation(dealer: DealerDetail): string {
  return `${dealer.district.name}, ${dealer.province.name}, ${dealer.department.name} (${dealer.district.code})`;
}
