import { Navigate, Outlet } from "react-router";
import type { ModuleCode } from "../app/modules";
import { useMe } from "./useMe";

/** Sin el módulo en `me.modules` → `/sin-permiso` (sección 8.4). La API igual responde 403 si se la llama. */
export function RequireModule({ code }: { code: ModuleCode }) {
  const me = useMe();
  if (!me.modules.some((module) => module.code === code)) return <Navigate to="/sin-permiso" replace />;
  return <Outlet />;
}
