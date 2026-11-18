import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { buttonClasses } from "../../components/styles";
import { createUser, type UserCreateRequest } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useRoles, userKeys } from "./queries";
import { EMPTY_USER_FORM, toCreateRequest, USER_FORM_FIELDS, userFormSchema } from "./schema";
import { TemporaryPasswordModal } from "./TemporaryPasswordModal";
import { UserFields } from "./UserFields";

const TITLE = "Nuevo usuario";
const schema = userFormSchema("create");

/**
 * Usuarios — alta (sección 8.6). Tras el `201` muestra la contraseña temporal una sola vez y, con "Entendido", va al
 * detalle del usuario creado. Los `409 DUPLICATE` y `422` van a su campo.
 */
export function UserCreatePage() {
  useDocumentTitle(TITLE);
  const client = useQueryClient();
  const navigate = useNavigate();
  const rolesQuery = useRoles();
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; username: string; password: string } | null>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY_USER_FORM });

  const mutation = useMutation({
    mutationFn: async (body: UserCreateRequest) => unwrap(await createUser(body)),
    onSuccess: ({ user, temporaryPassword }) => {
      client.setQueryData(userKeys.detail(user.id), user);
      void client.invalidateQueries({ queryKey: userKeys.lists });
      void client.invalidateQueries({ queryKey: ["users", "all"] });
      setCreated({ id: user.id, username: user.username, password: temporaryPassword });
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 401)) return;
      const fieldError = failure.status === 409 || failure.status === 422;
      if (!(fieldError && applyFieldErrors(form.setError, failure, USER_FORM_FIELDS))) setFormError(failureMessage(failure));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(toCreateRequest(values));
  });

  let content;
  if (rolesQuery.isError) content = <ErrorState onRetry={() => void rolesQuery.refetch()} />;
  else if (rolesQuery.isPending) content = <LoadingState />;
  else {
    content = (
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
        <p className="text-sm text-slate-700">* Campo obligatorio</p>
        <UserFields form={form} roles={rolesQuery.data} />
        <Alert variant="error">{formError}</Alert>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={mutation.isPending} loadingText="Guardando...">
            Guardar
          </Button>
          <Link to="/usuarios" className={buttonClasses("secondary")}>
            Cancelar
          </Link>
        </div>
      </form>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={TITLE} />
      <div className="rounded-lg bg-white p-6 shadow-sm">{content}</div>
      <TemporaryPasswordModal
        open={created !== null}
        username={created?.username ?? ""}
        password={created?.password ?? ""}
        onClose={() => {
          if (created) void navigate(`/usuarios/${created.id}`, { replace: true });
        }}
      />
    </div>
  );
}
