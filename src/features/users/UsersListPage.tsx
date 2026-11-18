import { Link } from "react-router";
import { useMe } from "../../auth/useMe";
import { DataTable, type Column } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { SearchField } from "../../components/SearchField";
import { Select } from "../../components/Select";
import { buttonClasses } from "../../components/styles";
import type { UserListParams, UserSummary } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { fullName } from "../../lib/format";
import {
  DEFAULT_PAGE_SIZE,
  nextSort,
  readEnum,
  readPage,
  readPageSize,
  readSort,
  readText,
  useClampPage,
  useUrlParams,
} from "../../lib/listParams";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { ROLE_CODES, USER_STATUSES, USER_STATUS_LABELS } from "./labels";
import { useRoles, useUsers } from "./queries";
import { UserActionButtons } from "./UserActionButtons";
import { UserStatusBadge } from "./UserStatusBadge";
import { useUserActions } from "./useUserActions";

const TITLE = "Usuarios";
const USER_SORTS = ["lastNames", "username", "createdAt", "lastLoginAt"] as const;
type UserSort = (typeof USER_SORTS)[number];

/** Lee los filtros, el orden y la página de la URL (sección 8.6). Un valor desconocido se ignora. */
function readUserListParams(params: URLSearchParams): UserListParams {
  return {
    q: readText(params, "q") || undefined,
    roleCode: readEnum(params, "roleCode", ROLE_CODES),
    status: readEnum(params, "status", USER_STATUSES),
    page: readPage(params),
    pageSize: readPageSize(params),
    ...readSort(params, USER_SORTS, "lastNames"),
  };
}

/**
 * Usuarios — lista (sección 8.6): búsqueda, filtros Rol y Estado, orden por columna y paginación, todo en la URL.
 * Acciones según el estado; en la fila propia se ocultan Desactivar, Eliminar y Generar contraseña temporal.
 */
export function UsersListPage() {
  useDocumentTitle(TITLE);
  const me = useMe();
  const [params, update] = useUrlParams();
  const listParams = readUserListParams(params);
  const usersQuery = useUsers(listParams);
  const rolesQuery = useRoles();
  const actions = useUserActions();
  useClampPage(usersQuery.data, listParams.page, listParams.pageSize, update);

  const columns: Column<UserSummary>[] = [
    { key: "username", header: "Usuario", sortKey: "username", cell: (user) => user.username, className: "whitespace-nowrap" },
    { key: "name", header: "Nombres y apellidos", sortKey: "lastNames", cell: (user) => fullName(user) },
    { key: "dni", header: "DNI", cell: (user) => user.dni, className: "whitespace-nowrap" },
    { key: "email", header: "Correo", cell: (user) => user.email },
    { key: "role", header: "Rol", cell: (user) => user.role.name, className: "whitespace-nowrap" },
    { key: "status", header: "Estado", cell: (user) => <UserStatusBadge status={user.status} /> },
    {
      key: "lastLoginAt",
      header: "Último acceso",
      sortKey: "lastLoginAt",
      cell: (user) => formatDateTime(user.lastLoginAt),
      className: "whitespace-nowrap",
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (user) => (
        <UserActionButtons
          user={user}
          isSelf={user.id === me.id}
          onAction={actions.run}
          disabled={actions.pendingUserId === user.id}
        />
      ),
      className: "min-w-64",
    },
  ];

  let content;
  if (usersQuery.isError || rolesQuery.isError) {
    content = (
      <ErrorState
        onRetry={() => {
          if (usersQuery.isError) void usersQuery.refetch();
          if (rolesQuery.isError) void rolesQuery.refetch();
        }}
      />
    );
  } else if (usersQuery.isPending) {
    content = <LoadingState />;
  } else if (usersQuery.data.items.length === 0) {
    content = <EmptyState />;
  } else {
    const { data } = usersQuery;
    content = (
      <>
        <DataTable
          label={TITLE}
          columns={columns}
          rows={data.items}
          rowKey={(user) => user.id}
          sort={{ sortBy: listParams.sortBy, sortOrder: listParams.sortOrder }}
          onSort={(column) => update({ ...nextSort<UserSort>(listParams, column as UserSort) })}
          busy={usersQuery.isPlaceholderData}
        />
        <Pagination
          page={listParams.page}
          pageSize={listParams.pageSize}
          total={data.total}
          onPageChange={(page) => update({ page: page === 1 ? null : page })}
          onPageSizeChange={(size) => update({ pageSize: size === DEFAULT_PAGE_SIZE ? null : size })}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={TITLE}
        actions={
          <Link to="/usuarios/nuevo" className={buttonClasses()}>
            Nuevo usuario
          </Link>
        }
      />
      <div className="mb-4 grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <SearchField
          label="Buscar por DNI, nombre, usuario o correo"
          value={listParams.q ?? ""}
          onSearch={(q) => update({ q })}
        />
        <Select
          label="Rol"
          placeholder="Todos"
          options={(rolesQuery.data ?? []).map((role) => ({ value: role.code, label: role.name }))}
          value={listParams.roleCode ?? ""}
          onChange={(event) => update({ roleCode: event.target.value })}
        />
        <Select
          label="Estado"
          placeholder="Todos"
          options={USER_STATUSES.map((status) => ({ value: status, label: USER_STATUS_LABELS[status] }))}
          value={listParams.status ?? ""}
          onChange={(event) => update({ status: event.target.value })}
        />
      </div>
      {content}
      {actions.dialogs}
    </>
  );
}
