import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { ME_QUERY_KEY } from "../../auth/session";
import { useMe } from "../../auth/useMe";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { useToast } from "../../components/Toast";
import { buttonClasses } from "../../components/styles";
import { updateUser, type CodeName, type UserDetail, type UserUpdateRequest } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { USER_NOT_FOUND } from "./labels";
import { useRoles, useUser, userKeys } from "./queries";
import { toUpdateRequest, USER_FORM_FIELDS, userFormSchema, userToFormValues } from "./schema";
import { UserFields } from "./UserFields";

const TITLE = "Editar usuario";
const schema = userFormSchema("edit");

/** Usuarios — edición (sección 8.6). Usuario deshabilitado; el rol también, si es el propio usuario. */
export function UserEditPage() {
  useDocumentTitle(TITLE);
  const { id = "" } = useParams();
  const userQuery = useUser(id);
  const rolesQuery = useRoles();

  let content;
  const failure = userQuery.isError ? failureOf(userQuery.error) : null;
  if (failure && (isHttpStatus(failure, 404) || isHttpStatus(failure, 422))) {
    content = (
      <Alert variant="error" live={false}>
        {failure.detail && failure.status === 404 ? failure.detail : USER_NOT_FOUND}
      </Alert>
    );
  } else if (userQuery.isError || rolesQuery.isError) {
    content = (
      <ErrorState
        onRetry={() => {
          if (userQuery.isError) void userQuery.refetch();
          if (rolesQuery.isError) void rolesQuery.refetch();
        }}
      />
    );
  } else if (userQuery.isPending || rolesQuery.isPending) {
    content = <LoadingState />;
  } else {
    content = <UserEditForm user={userQuery.data} roles={rolesQuery.data} reload={() => userQuery.refetch()} />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={TITLE} />
      <div className="rounded-lg bg-surface p-6 shadow-sm">{content}</div>
    </div>
  );
}

interface UserEditFormProps {
  user: UserDetail;
  roles: readonly CodeName[];
  /** "Recargar" tras un `VERSION_CONFLICT`: vuelve a pedir el usuario. */
  reload: () => Promise<{ data?: UserDetail }>;
}

function UserEditForm({ user, roles, reload }: UserEditFormProps) {
  const me = useMe();
  const isSelf = me.id === user.id;
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  // Versión de los datos cargados en el formulario: una nueva consulta en segundo plano (p. ej. al volver el foco) no
  // la cambia, así el `PUT` detecta el conflicto (sección 4.1). Solo "Recargar" la actualiza.
  const [loadedVersion, setLoadedVersion] = useState(user.version);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: userToFormValues(user) });

  const mutation = useMutation({
    mutationFn: async (body: UserUpdateRequest) => unwrap(await updateUser(user.id, body)),
    onSuccess: (updated) => {
      client.setQueryData(userKeys.detail(updated.id), updated);
      void client.invalidateQueries({ queryKey: userKeys.lists });
      void client.invalidateQueries({ queryKey: ["users", "all"] });
      // Editar sus propios datos desde Usuarios cambia `me` (nombre en la cabecera).
      if (isSelf) void client.invalidateQueries({ queryKey: ME_QUERY_KEY });
      toast.show("Los cambios se guardaron correctamente.", "success");
      void navigate(`/usuarios/${updated.id}`);
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 401)) return;
      if (isHttpStatus(failure, 409, "VERSION_CONFLICT")) {
        setConflict(true);
        return;
      }
      const fieldError = failure.status === 409 || failure.status === 422;
      if (!(fieldError && applyFieldErrors(form.setError, failure, USER_FORM_FIELDS))) setFormError(failureMessage(failure));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setConflict(false);
    mutation.mutate(toUpdateRequest(values, { ...user, version: loadedVersion }, isSelf));
  });

  // Conflicto de versión (Anexo A.2): "Recargar" trae el registro vigente y descarta lo escrito.
  const onReload = async () => {
    setReloading(true);
    const result = await reload();
    setReloading(false);
    if (result.data) {
      form.reset(userToFormValues(result.data));
      setLoadedVersion(result.data.version);
      setConflict(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
      <p className="text-sm text-fg-muted">* Campo obligatorio</p>
      <UserFields form={form} roles={roles} fixedUsername={user.username} roleDisabled={isSelf} />
      <Alert variant="warning">
        {conflict && (
          <div className="flex flex-wrap items-center gap-3">
            <span>El registro fue modificado por otro usuario.</span>
            <Button variant="secondary" loading={reloading} onClick={() => void onReload()}>
              Recargar
            </Button>
          </div>
        )}
      </Alert>
      <Alert variant="error">{formError}</Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={mutation.isPending} loadingText="Guardando...">
          Guardar
        </Button>
        <Link to={`/usuarios/${user.id}`} className={buttonClasses("secondary")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
