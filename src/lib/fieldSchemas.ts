/**
 * Campos de formulario con zod que dan los mismos mensajes que la API (sección 2.4: validación espejo). Vacío →
 * "Campo obligatorio" (B6, decisión 14); el resto, el mensaje del validador (Anexo A.3).
 */
import { z } from "zod";
import { REQUIRED_MESSAGE } from "./errors";

type Check = (value: string) => string | null;

/** Obligatorio: vacío o solo espacios → "Campo obligatorio"; si no, `check`. */
export function requiredField(check?: Check) {
  return z.string().superRefine((value, ctx) => {
    if (value.trim() === "") {
      ctx.addIssue({ code: "custom", message: REQUIRED_MESSAGE });
      return;
    }
    const message = check?.(value);
    if (message) ctx.addIssue({ code: "custom", message });
  });
}

/** Opcional: vacío no se valida (se envía como null). */
export function optionalField(check: Check) {
  return z.string().superRefine((value, ctx) => {
    if (value.trim() === "") return;
    const message = check(value);
    if (message) ctx.addIssue({ code: "custom", message });
  });
}

/** Texto opcional del formulario → null si queda vacío (la API también lo guarda como null). */
export function emptyToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}
