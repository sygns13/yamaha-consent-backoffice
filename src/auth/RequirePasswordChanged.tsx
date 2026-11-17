import { Navigate, Outlet } from "react-router";
import { useMe } from "./useMe";

/** Con `mustChangePassword`, la única pantalla permitida es `/cambiar-contrasena` (además de cerrar sesión). */
export function RequirePasswordChanged() {
  const me = useMe();
  if (me.mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />;
  return <Outlet />;
}
