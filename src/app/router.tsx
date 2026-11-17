import { createBrowserRouter, type RouteObject } from "react-router";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireModule } from "../auth/RequireModule";
import { RequirePasswordChanged } from "../auth/RequirePasswordChanged";
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { HomePage } from "../features/home/HomePage";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

/**
 * Rutas y guardas (sección 8.4). Las guardas son rutas de layout:
 * RequireAuth (sesión) → AppLayout → [/cambiar-contrasena | RequirePasswordChanged → Inicio, perfil, 403 y
 * RequireModule(código) → rutas del módulo].
 */
export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/recuperar-contrasena", element: <ForgotPasswordPage /> },
      { path: "/restablecer-contrasena", element: <ResetPasswordPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/cambiar-contrasena", element: <ChangePasswordPage /> },
          {
            element: <RequirePasswordChanged />,
            children: [
              { path: "/", element: <HomePage /> },
              { path: "/sin-permiso", element: <ForbiddenPage /> },
              // Provisionales hasta B7 y B8.
              { path: "/perfil", element: <PlaceholderPage title="Mi perfil" /> },
              {
                element: <RequireModule code="DEALERS" />,
                children: ["/dealers", "/dealers/nuevo", "/dealers/:id", "/dealers/:id/editar"].map((path) => ({
                  path,
                  element: <PlaceholderPage title="Dealers" />,
                })),
              },
              {
                element: <RequireModule code="USUARIOS" />,
                children: ["/usuarios", "/usuarios/nuevo", "/usuarios/:id", "/usuarios/:id/editar"].map((path) => ({
                  path,
                  element: <PlaceholderPage title="Usuarios" />,
                })),
              },
              {
                element: <RequireModule code="AUDITORIA" />,
                children: [{ path: "/auditoria", element: <PlaceholderPage title="Bitácora de auditoría" /> }],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
