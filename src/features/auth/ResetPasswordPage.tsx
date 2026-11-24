import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PasswordField } from "../../components/PasswordField";
import { PasswordPolicyChecklist } from "../../components/PasswordPolicyChecklist";
import { LINK_CLASSES } from "../../components/styles";
import { getResetTokenStatus, resetPassword, type PasswordPolicy, type PasswordResetRequest } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { usePasswordPolicy } from "./queries";
import { resetPasswordSchema } from "./schemas";

const TITLE = "Crear nueva contraseña";

/**
 * Restablecer contraseña (sección 8.6). Lee `t`, lo guarda en memoria y lo quita de la URL (`navigate` con `replace`
 * usa `history.replaceState`). Solo con `tokenStatus = VALID` muestra el formulario; cualquier otro estado, `404` o un
 * `410` al guardar → "enlace no válido" con el enlace para pedir otro.
 */
export function ResetPasswordPage() {
  useDocumentTitle(TITLE);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => searchParams.get("t") ?? "");
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    if (location.search !== "") void navigate({ pathname: location.pathname }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const tokenQuery = useQuery({
    queryKey: ["password-reset-token", token],
    queryFn: async () => unwrap(await getResetTokenStatus(token)),
    enabled: token !== "",
    staleTime: Infinity,
    // El token no queda en la caché al salir de la página.
    gcTime: 0,
  });
  const policyQuery = usePasswordPolicy();

  let content;
  if (token === "" || linkInvalid) {
    content = <InvalidLink />;
  } else if (tokenQuery.isError) {
    content = isHttpStatus(failureOf(tokenQuery.error), 404) ? (
      <InvalidLink />
    ) : (
      <ErrorState onRetry={() => void tokenQuery.refetch()} />
    );
  } else if (tokenQuery.isPending) {
    content = <LoadingState />;
  } else if (tokenQuery.data.tokenStatus !== "VALID") {
    content = <InvalidLink />;
  } else if (policyQuery.isError) {
    content = <ErrorState onRetry={() => void policyQuery.refetch()} />;
  } else if (policyQuery.isPending) {
    content = <LoadingState />;
  } else {
    content = <ResetPasswordForm token={token} policy={policyQuery.data} onInvalidLink={() => setLinkInvalid(true)} />;
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-fg">{TITLE}</h1>
      <div className="mt-6">{content}</div>
    </>
  );
}

function InvalidLink() {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="error">El enlace no es válido o ya venció.</Alert>
      <p className="text-sm">
        <Link to="/recuperar-contrasena" className={LINK_CLASSES}>
          Solicitar un nuevo enlace
        </Link>
      </p>
    </div>
  );
}

function ResetPasswordForm({
  token,
  policy,
  onInvalidLink,
}: {
  token: string;
  policy: PasswordPolicy;
  onInvalidLink: () => void;
}) {
  const navigate = useNavigate();
  const checklistId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => resetPasswordSchema(policy), [policy]);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { newPassword: "", confirmPassword: "" } });
  const newPassword = useWatch({ control: form.control, name: "newPassword" });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: async (body: PasswordResetRequest) => unwrap(await resetPassword(body)),
    // No inicia sesión (sección 6.3): al login con el aviso de contraseña actualizada.
    onSuccess: () => void navigate("/login?motivo=contrasena-actualizada", { replace: true }),
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 410) || isHttpStatus(failure, 404)) onInvalidLink();
      else if (!(failure.status === 422 && applyFieldErrors(form.setError, failure, ["newPassword"]))) {
        setFormError(failureMessage(failure));
      }
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate({ token, newPassword: values.newPassword });
  });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <PasswordField
        label="Nueva contraseña"
        autoComplete="new-password"
        describedBy={checklistId}
        error={errors.newPassword?.message}
        {...form.register("newPassword")}
      />
      <PasswordPolicyChecklist id={checklistId} policy={policy} password={newPassword} />
      <PasswordField
        label="Confirmar contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <Alert variant="error">{formError}</Alert>
      <Button type="submit" loading={mutation.isPending} loadingText="Guardando...">
        Guardar contraseña
      </Button>
    </form>
  );
}
