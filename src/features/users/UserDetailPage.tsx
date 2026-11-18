import { useNavigate, useParams } from "react-router";
import { useMe } from "../../auth/useMe";
import { Alert } from "../../components/Alert";
import { DetailList } from "../../components/DetailList";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import type { UserDetail } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { failureOf, isHttpStatus } from "../../lib/errors";
import { displayValue, userRefLabel, yesNo } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { USER_DETAIL_TITLE, USER_NOT_FOUND } from "./labels";
import { useUser } from "./queries";
import { UserActionButtons } from "./UserActionButtons";
import { UserStatusBadge } from "./UserStatusBadge";
import { useUserActions } from "./useUserActions";

/**
 * Usuarios — detalle (sección 8.6): datos, estado, bloqueado hasta, debe cambiar contraseña, último acceso, autoría
 * y las mismas acciones de la lista. Inexistente → el `detail` de la API (aprobado en el spec v1.5).
 */
export function UserDetailPage() {
  useDocumentTitle(USER_DETAIL_TITLE);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const me = useMe();
  const query = useUser(id);
  const actions = useUserActions({ onDeleted: () => void navigate("/usuarios") });

  let content;
  const failure = query.isError ? failureOf(query.error) : null;
  if (failure && (isHttpStatus(failure, 404) || isHttpStatus(failure, 422))) {
    content = (
      <Alert variant="error" live={false}>
        {failure.detail && failure.status === 404 ? failure.detail : USER_NOT_FOUND}
      </Alert>
    );
  } else if (query.isError) {
    content = <ErrorState onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    content = <LoadingState />;
  } else {
    const user = query.data;
    content = (
      <div className="flex flex-col gap-6 rounded-lg bg-white p-6 shadow-sm">
        <UserActionButtons
          user={user}
          isSelf={user.id === me.id}
          onAction={actions.run}
          disabled={actions.pendingUserId === user.id}
          showView={false}
        />
        <DetailList items={detailItems(user)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={USER_DETAIL_TITLE} />
      {content}
      {actions.dialogs}
    </div>
  );
}

function detailItems(user: UserDetail) {
  return [
    { label: "Usuario", value: user.username },
    { label: "DNI", value: user.dni },
    { label: "Nombres", value: user.firstNames },
    { label: "Apellidos", value: user.lastNames },
    { label: "Correo", value: user.email },
    { label: "Celular", value: displayValue(user.phone) },
    { label: "Rol", value: user.role.name },
    { label: "Estado", value: <UserStatusBadge status={user.status} /> },
    { label: "Bloqueado hasta", value: formatDateTime(user.lockedUntil) },
    { label: "Debe cambiar contraseña", value: yesNo(user.mustChangePassword) },
    { label: "Último acceso", value: formatDateTime(user.lastLoginAt) },
    { label: "Creado por", value: userRefLabel(user.createdBy) },
    { label: "Creado el", value: formatDateTime(user.createdAt) },
    { label: "Actualizado por", value: userRefLabel(user.updatedBy) },
    { label: "Actualizado el", value: formatDateTime(user.updatedAt) },
  ];
}
