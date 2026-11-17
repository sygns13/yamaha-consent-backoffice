/**
 * Módulos con permiso (sección 3.2). El nombre de cada módulo sale de `me.modules` (API); la ruta, la etiqueta del
 * menú (sección 8.5) y la descripción de la tarjeta de Inicio (Anexo A.2) son textos del frontend (decisión D1 de la
 * sesión 4: `/auth/me` devuelve `{code, name}` sin descripción). Un código que no esté aquí no se muestra.
 */
export const MODULES = {
  DEALERS: {
    path: "/dealers",
    menuLabel: "Dealers",
    description: "Registra y actualiza los datos de los Dealers.",
  },
  USUARIOS: {
    path: "/usuarios",
    menuLabel: "Usuarios",
    description: "Crea y administra los usuarios del BackOffice.",
  },
  AUDITORIA: {
    path: "/auditoria",
    menuLabel: "Bitácora",
    description: "Consulta las acciones registradas en el sistema.",
  },
} as const;

export type ModuleCode = keyof typeof MODULES;

export function isKnownModule(code: string): code is ModuleCode {
  return Object.hasOwn(MODULES, code);
}
