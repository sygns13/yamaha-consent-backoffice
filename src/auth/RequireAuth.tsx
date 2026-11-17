import { Navigate, Outlet, useLocation } from "react-router";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { loginPath } from "../lib/navigation";
import { useSession } from "./useMe";

/**
 * Guarda de sesión (sección 8.4). Sin sesión → `/login?next=<ruta>`; sesión vencida → con
 * `motivo=sesion-expirada`; tras cerrar sesión → `/login`. El cambio obligatorio lo resuelve `RequirePasswordChanged`.
 */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.data?.status === "authenticated") return <Outlet />;
  if (session.data?.status === "anonymous") {
    return <Navigate to={loginPath(session.data.reason, location.pathname + location.search)} replace />;
  }
  if (session.isError) {
    return (
      <main className="mx-auto max-w-md p-6">
        <ErrorState onRetry={() => void session.refetch()} />
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md p-6">
      <LoadingState />
    </main>
  );
}
