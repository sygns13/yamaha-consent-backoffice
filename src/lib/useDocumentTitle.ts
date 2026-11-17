import { useEffect } from "react";

export const PRODUCT_TITLE = "BackOffice Consentimientos";

/** Título del documento: "<Página> · BackOffice Consentimientos" (sección 8.4). */
export function useDocumentTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} · ${PRODUCT_TITLE}`;
  }, [page]);
}
