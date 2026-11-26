import { ScrollText, Store, Users } from "lucide-react";

/**
 * Módulos con permiso (sección 3.2). El nombre de cada módulo sale de `me.modules` (API); la ruta, la etiqueta del
 * menú (sección 8.5) y la descripción de la tarjeta de Inicio (Anexo A.2) son textos del frontend (decisión D1 de la
 * sesión 4: `/auth/me` devuelve `{code, name}` sin descripción). Un código que no esté aquí no se muestra. El ícono
 * (decorativo) es el del menú lateral y de la tarjeta de Inicio (spec de rediseño, 3.7).
 */
export const MODULES = {
  DEALERS: {
    path: "/dealers",
    menuLabel: "Dealers",
    description: "Registra y actualiza los datos de los Dealers.",
    icon: Store,
  },
  USUARIOS: {
    path: "/usuarios",
    menuLabel: "Usuarios",
    description: "Crea y administra los usuarios del BackOffice.",
    icon: Users,
  },
  AUDITORIA: {
    path: "/auditoria",
    menuLabel: "Bitácora",
    description: "Consulta las acciones registradas en el sistema.",
    icon: ScrollText,
  },
} as const;

export type ModuleCode = keyof typeof MODULES;

export function isKnownModule(code: string): code is ModuleCode {
  return Object.hasOwn(MODULES, code);
}

/** Enlace "Volver" de las listas de los módulos (spec de rediseño v1.3, Anexo A). */
export const BACK_TO_HOME = { to: "/", label: "Volver al inicio" } as const;

/** Enlace "Volver" de un detalle a la lista de su módulo: "Volver a Dealers", "Volver a Usuarios". */
export function backToModule(code: ModuleCode): { to: string; label: string } {
  return { to: MODULES[code].path, label: `Volver a ${MODULES[code].menuLabel}` };
}
