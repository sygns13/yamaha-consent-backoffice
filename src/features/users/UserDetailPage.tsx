import { useNavigate, useParams } from "react-router";
import { backToModule } from "../../app/modules";
import { useMe } from "../../auth/useMe";
import { Alert } from "../../components/Alert";
import { Card } from "../../components/Card";
import { DetailList } from "../../components/DetailList";
import { ErrorState } from "../../components/ErrorState";
import { PageHeader } from "../../components/PageHeader";
import { DetailSkeleton } from "../../components/Skeleton";
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
 * y las mismas acciones de la lista. Inexistente → el `detail` de la API (aprobado en el spec v1.5). Spec de rediseño,
 * 6.5: el estado junto al título, todas las acciones como botones en el encabezado (P1) y la autoría en un segundo
 * bloque de la tarjeta. "Estado" sigue también en los datos.
 */
export function UserDetailPage() {
  useDocumentTitle(USER_DETAIL_TITLE);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const me = useMe();
  const query = useUser(id);
  const userActions = useUserActions({ onDeleted: () => void navigate("/usuarios") });

  let content;
  let actions;
  let badge;
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
    // Primera carga (4.10).
    content = (
      <Card>
        <DetailSkeleton items={11} />
      </Card>
    );
  } else {
    const user = query.data;
    badge = <UserStatusBadge status={user.status} />;
    actions = (
      <UserActionButtons
        user={user}
        isSelf={user.id === me.id}
        onAction={userActions.run}
        disabled={userActions.pendingUserId === user.id}
        variant="detail"
      />
    );
    content = (
      <Card>
        <DetailList items={detailItems(user)} />
        <div className="mt-6 border-t border-border pt-6">
          <DetailList items={authorshipItems(user)} />
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={USER_DETAIL_TITLE} badge={badge} actions={actions} back={backToModule("USUARIOS")} />
      {content}
      {userActions.dialogs}
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
  ];
}

/** Autoría (spec de rediseño, 6.5): segundo bloque de la tarjeta, sin encabezado. */
function authorshipItems(user: UserDetail) {
  return [
    { label: "Creado por", value: userRefLabel(user.createdBy) },
    { label: "Creado el", value: formatDateTime(user.createdAt) },
    { label: "Actualizado por", value: userRefLabel(user.updatedBy) },
    { label: "Actualizado el", value: formatDateTime(user.updatedAt) },
  ];
}
