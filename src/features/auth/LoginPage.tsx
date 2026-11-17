import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useSearchParams } from "react-router";
import { removeNonSessionQueries, startSession } from "../../auth/session";
import { useSession } from "../../auth/useMe";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { LoadingState } from "../../components/LoadingState";
import { PasswordField } from "../../components/PasswordField";
import { LINK_CLASSES } from "../../components/styles";
import { TextField } from "../../components/TextField";
import { login, type LoginRequest } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { safeNext } from "../../lib/navigation";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { loginSchema } from "./schemas";

const INVALID_CREDENTIALS = "Usuario o contraseña incorrectos.";

/**
 * Iniciar sesión (sección 8.6). El login exitoso solo guarda `me` en la caché; la redirección de abajo lo lleva a su
 * destino: con cambio obligatorio a `/cambiar-contrasena`; si no, a `next` (solo rutas internas) o a Inicio. Quien
 * llega con una sesión válida va a Inicio (sección 8.4).
 */
export function LoginPage() {
  useDocumentTitle("Iniciar sesión");
  const client = useQueryClient();
  const session = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const reason = params.get("motivo");
  const [formError, setFormError] = useState<string | null>(null);
  // Se marca antes de guardar la sesión: así la redirección distingue "recién ingresó" de "ya tenía sesión".
  const [loggedIn, setLoggedIn] = useState(false);

  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: async (values: LoginRequest) => unwrap(await login(values)),
    // 401 aquí son credenciales incorrectas, no una sesión vencida.
    meta: { ignoreAuthErrors: true },
    onSuccess: (me) => {
      setLoggedIn(true);
      startSession(client, me);
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 401)) setFormError(INVALID_CREDENTIALS);
      else if (!(failure.status === 422 && applyFieldErrors(form.setError, failure, ["username", "password"]))) {
        // 423 y 403: el detail de la API; red o 5xx: mensaje de conexión.
        setFormError(failureMessage(failure));
      }
    },
  });

  // Sin sesión: limpiar la caché de lo que quedó de la anterior (sección 8.2).
  const status = session.data?.status;
  useEffect(() => {
    if (status === "anonymous") removeNonSessionQueries(client);
  }, [client, status]);

  if (session.data?.status === "authenticated") {
    // Recién ingresó (sección 8.6): cambio obligatorio, o `next`, o Inicio. Ya tenía sesión (sección 8.4): Inicio
    // (y RequirePasswordChanged lo lleva al cambio obligatorio si corresponde).
    let target = "/";
    if (loggedIn) target = session.data.me.mustChangePassword ? "/cambiar-contrasena" : (next ?? "/");
    return <Navigate to={target} replace />;
  }
  if (session.isPending) return <LoadingState />;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
  });

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
      <div className="mt-4 empty:hidden">
        {reason === "sesion-expirada" && (
          <Alert variant="warning" live={false}>
            Tu sesión expiró. Ingresa nuevamente.
          </Alert>
        )}
        {reason === "contrasena-actualizada" && (
          <Alert variant="success" live={false}>
            Tu contraseña fue actualizada. Ingresa con tu nueva contraseña.
          </Alert>
        )}
      </div>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-6 flex flex-col gap-4">
        <TextField
          label="Usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...form.register("username")}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register("password")}
        />
        <Alert variant="error">{formError}</Alert>
        <Button type="submit" loading={mutation.isPending} loadingText="Ingresando...">
          Ingresar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/recuperar-contrasena" className={LINK_CLASSES}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </>
  );
}
