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
import { LoadingState } from "../components/LoadingState";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { NotFoundPage } from "../pages/NotFoundPage";

// Pantallas de cada módulo en su propio chunk, cargadas al entrar (decisión de la sesión 4: el bundle de B6 ya rondaba
// los 500 kB). Todas las rutas de un módulo importan el mismo archivo, así cada módulo es una sola descarga.
const dealersPages = () => import("../features/dealers/pages");
const usersPages = () => import("../features/users/pages");
const profilePage = () => import("../features/profile/ProfilePage");
const auditPage = () => import("../features/audit/AuditLogPage");

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
    // Mientras se descarga el chunk de una ruta lazy en la carga inicial.
    hydrateFallbackElement: <LoadingState />,
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
              { path: "/perfil", lazy: async () => ({ Component: (await profilePage()).ProfilePage }) },
              {
                element: <RequireModule code="DEALERS" />,
                children: [
                  { path: "/dealers", lazy: async () => ({ Component: (await dealersPages()).DealersListPage }) },
                  { path: "/dealers/nuevo", lazy: async () => ({ Component: (await dealersPages()).DealerCreatePage }) },
                  { path: "/dealers/:id", lazy: async () => ({ Component: (await dealersPages()).DealerDetailPage }) },
                  { path: "/dealers/:id/editar", lazy: async () => ({ Component: (await dealersPages()).DealerEditPage }) },
                ],
              },
              {
                element: <RequireModule code="USUARIOS" />,
                children: [
                  { path: "/usuarios", lazy: async () => ({ Component: (await usersPages()).UsersListPage }) },
                  { path: "/usuarios/nuevo", lazy: async () => ({ Component: (await usersPages()).UserCreatePage }) },
                  { path: "/usuarios/:id", lazy: async () => ({ Component: (await usersPages()).UserDetailPage }) },
                  { path: "/usuarios/:id/editar", lazy: async () => ({ Component: (await usersPages()).UserEditPage }) },
                ],
              },
              {
                element: <RequireModule code="AUDITORIA" />,
                children: [{ path: "/auditoria", lazy: async () => ({ Component: (await auditPage()).AuditLogPage }) }],
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
