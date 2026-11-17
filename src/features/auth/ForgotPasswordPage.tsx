import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { LINK_CLASSES } from "../../components/styles";
import { TextField } from "../../components/TextField";
import { forgotPassword, type ForgotPasswordRequest } from "../../lib/api";
import { failureMessage, failureOf, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { forgotPasswordSchema } from "./schemas";

/**
 * Recuperar contraseña (sección 8.6). La API responde siempre el mismo 202 (no revela cuentas): se muestra su
 * `detail`, se oculta el formulario y queda el enlace para volver al login.
 */
export function ForgotPasswordPage() {
  useDocumentTitle("Recuperar contraseña");
  const [sentDetail, setSentDetail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { identifier: "" } });
  const mutation = useMutation({
    mutationFn: async (values: ForgotPasswordRequest) => unwrap(await forgotPassword(values)),
    onSuccess: (data) => setSentDetail(data.detail),
    onError: (error) => {
      const failure = failureOf(error);
      if (!(failure.status === 422 && applyFieldErrors(form.setError, failure, ["identifier"]))) {
        setFormError(failureMessage(failure));
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
  });

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Recuperar contraseña</h1>
      <Alert variant="success" live="polite" className="mt-4">
        {sentDetail}
      </Alert>
      {sentDetail === null && (
        <>
          <p className="mt-2 text-sm text-slate-700">
            Ingresa tu usuario o tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </p>
          <form noValidate onSubmit={(event) => void onSubmit(event)} className="mt-6 flex flex-col gap-4">
            <TextField
              label="Usuario o correo"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              error={form.formState.errors.identifier?.message}
              {...form.register("identifier")}
            />
            <Alert variant="error">{formError}</Alert>
            <Button type="submit" loading={mutation.isPending}>
              Enviar enlace
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className={LINK_CLASSES}>
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
