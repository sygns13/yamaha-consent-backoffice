import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { ME_QUERY_KEY, setMustChangePassword } from "../../auth/session";
import { useMe } from "../../auth/useMe";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { PasswordField } from "../../components/PasswordField";
import { PasswordPolicyChecklist } from "../../components/PasswordPolicyChecklist";
import { useToast } from "../../components/Toast";
import { changePassword, type ChangePasswordRequest, type Me, type PasswordPolicy } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { usePasswordPolicy } from "./queries";
import { changePasswordSchema } from "./schemas";

const TITLE = "Cambiar contraseña";

/**
 * Cambiar contraseña (sección 8.6). En modo obligatorio (`mustChangePassword`) muestra el aviso fijo y `AppLayout`
 * oculta el menú lateral y el de usuario (solo "Cerrar sesión"). Éxito → refrescar `["me"]`, aviso y Inicio.
 */
export function ChangePasswordPage() {
  useDocumentTitle(TITLE);
  const me = useMe();
  const policyQuery = usePasswordPolicy();

  let content;
  if (policyQuery.isError) content = <ErrorState onRetry={() => void policyQuery.refetch()} />;
  else if (policyQuery.isPending) content = <LoadingState />;
  else content = <ChangePasswordForm me={me} policy={policyQuery.data} />;

  return (
    <div className="max-w-xl">
      <PageHeader title={TITLE} />
      {me.mustChangePassword && (
        <Alert variant="warning" live={false} className="mb-6">
          Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
        </Alert>
      )}
      <div className="rounded-lg bg-white p-6 shadow-sm">{content}</div>
    </div>
  );
}

function ChangePasswordForm({ me, policy }: { me: Me; policy: PasswordPolicy }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const checklistId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => changePasswordSchema(policy, { username: me.username, dni: me.dni }), [policy, me.username, me.dni]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const newPassword = useWatch({ control: form.control, name: "newPassword" });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: async (body: ChangePasswordRequest) => unwrap(await changePassword(body)),
    onSuccess: () => {
      // La API ya rotó la cookie. Se baja la marca en la caché antes de navegar (si no, RequirePasswordChanged
      // devolvería a esta pantalla) y se vuelve a pedir `me`.
      setMustChangePassword(client, false);
      void client.invalidateQueries({ queryKey: ME_QUERY_KEY });
      toast.show("Tu contraseña fue actualizada.", "success");
      void navigate("/", { replace: true });
    },
    onError: (error) => {
      const failure = failureOf(error);
      // 401: el manejo global ya manda al login.
      if (isHttpStatus(failure, 401)) return;
      if (!(failure.status === 422 && applyFieldErrors(form.setError, failure, ["currentPassword", "newPassword"]))) {
        setFormError(failureMessage(failure));
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <PasswordField
        label="Contraseña actual"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register("currentPassword")}
      />
      <PasswordField
        label="Nueva contraseña"
        autoComplete="new-password"
        describedBy={checklistId}
        error={errors.newPassword?.message}
        {...form.register("newPassword")}
      />
      <PasswordPolicyChecklist
        id={checklistId}
        policy={policy}
        password={newPassword}
        personalData={{ username: me.username, dni: me.dni }}
      />
      <PasswordField
        label="Confirmar contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <Alert variant="error">{formError}</Alert>
      <Button type="submit" loading={mutation.isPending} loadingText="Guardando..." className="self-start">
        Cambiar contraseña
      </Button>
    </form>
  );
}
