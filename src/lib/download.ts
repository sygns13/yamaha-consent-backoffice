/**
 * Descarga de un archivo ya recibido (sección 8.2, decisión del 17/11/2026): no llama a la API (el `fetch` está en
 * `api.ts`); solo arma un enlace temporal con `URL.createObjectURL` y `download`, lo activa y lo libera.
 */

// Se libera después del clic, no en el mismo instante: algunos navegadores aún leen la URL al iniciar la descarga.
const REVOKE_DELAY_MS = 1_000;

export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
