import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useMe } from "../../auth/useMe";
import { DataTable, type Column } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { Select, type SelectOption } from "../../components/Select";
import { actionClasses } from "../../components/styles";
import { TextField } from "../../components/TextField";
import type { AuditLogItem, AuditLogParams, UserSummary } from "../../lib/api";
import { addDays, formatDateTime, isIsoDate, limaToday } from "../../lib/dates";
import { failureOf, isHttpStatus } from "../../lib/errors";
import { displayValue, EMPTY_VALUE, fullName, userRefLabel } from "../../lib/format";
import { DEFAULT_PAGE_SIZE, readEnum, readPage, readPageSize, useClampPage, useUrlParams } from "../../lib/listParams";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { actionLabel, AUDIT_ACTION_LABELS, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, ENTITY_TYPES, entityType } from "./actionLabels";
import { useAllUsers, useAuditLogs } from "./queries";

const TITLE = "Bitácora de auditoría";
/** Anexo A.3 (`from > to`, v1.3). */
const RANGE_ERROR = "La fecha final no puede ser anterior a la inicial.";
/** Por defecto, los últimos 7 días contando hoy, en hora de Lima (decisión D5, spec v1.5). */
const DEFAULT_DAYS = 7;
const DATE_KEYS = ["from", "to"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readDate(params: URLSearchParams, key: string): string {
  const value = params.get(key) ?? "";
  return isIsoDate(value) ? value : "";
}

/** Filtros de la URL (B7.4). `?from=` vacío = sin fecha (distinto de ausente, que aplica los 7 días por defecto). */
function readAuditParams(params: URLSearchParams): AuditLogParams {
  const actorUserId = params.get("actorUserId") ?? "";
  return {
    from: readDate(params, "from") || undefined,
    to: readDate(params, "to") || undefined,
    actorUserId: UUID.test(actorUserId) ? actorUserId : undefined,
    action: readEnum(params, "action", AUDIT_ACTIONS),
    entityType: readEnum(params, "entityType", AUDIT_ENTITY_TYPES),
    page: readPage(params),
    pageSize: readPageSize(params),
  };
}

/**
 * Opciones del filtro "Usuario": los usuarios vigentes y, si la URL trae a otro (p. ej. eliminado), ese actor. Sin la
 * lista de usuarios (rol sin el módulo `USUARIOS`), los actores de los resultados (v1.5).
 */
function userOptions(
  users: readonly UserSummary[] | null,
  actorUserId: string | undefined,
  items: readonly AuditLogItem[],
): SelectOption[] {
  let options: SelectOption[];
  if (users) {
    options = users.map((user) => ({ value: user.id, label: `${fullName(user)} (${user.username})` }));
  } else {
    const actors = new Map(items.flatMap((item) => (item.actor ? [[item.actor.id, item.actor] as const] : [])));
    options = [...actors.values()]
      .map((actor) => ({ value: actor.id, label: userRefLabel(actor) }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }
  if (actorUserId && !options.some((option) => option.value === actorUserId)) {
    const actor = items.find((item) => item.actor?.id === actorUserId)?.actor;
    options.push({ value: actorUserId, label: actor ? userRefLabel(actor) : actorUserId });
  }
  return options;
}

/**
 * Bitácora (sección 8.6): filtros Desde, Hasta (por defecto los últimos 7 días), Usuario, Acción y Tipo de entidad, en
 * la URL; tabla con el detalle expandible (JSON formateado). La entidad enlaza a su detalle (decisión D2).
 */
export function AuditLogPage() {
  useDocumentTitle(TITLE);
  const [params, update] = useUrlParams();
  const filters = readAuditParams(params);
  const datesSet = params.has("from") || params.has("to");
  const rangeError = filters.from && filters.to && filters.from > filters.to ? RANGE_ERROR : undefined;
  const logsQuery = useAuditLogs(filters, datesSet && rangeError === undefined);
  // La lista de usuarios exige `USUARIOS` (sección 3.2). Sin ese módulo, o si la API responde 403 (permiso quitado
  // durante la sesión), el filtro usa los actores de los resultados en lugar de fallar (v1.5).
  const canListUsers = useMe().modules.some((module) => module.code === "USUARIOS");
  const usersQuery = useAllUsers(canListUsers);
  const usersForbidden = usersQuery.isError && isHttpStatus(failureOf(usersQuery.error), 403);
  const users = canListUsers && !usersForbidden ? (usersQuery.data ?? []) : null;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  useClampPage(logsQuery.data, filters.page, filters.pageSize, update);

  // Sin fechas en la URL: los últimos 7 días, sin entrada nueva en el historial.
  useEffect(() => {
    if (params.has("from") || params.has("to")) return;
    const today = limaToday();
    update({ from: addDays(today, -(DEFAULT_DAYS - 1)), to: today }, { replace: true, keepEmpty: DATE_KEYS });
  }, [params, update]);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const failure = logsQuery.isError ? failureOf(logsQuery.error) : null;
  // Un 422 del servidor en `to` (from > to) se muestra en el campo, como el del cliente.
  const toError = rangeError ?? failure?.fieldErrors?.to;

  const columns: Column<AuditLogItem>[] = [
    { key: "occurredAt", header: "Fecha y hora", cell: (item) => formatDateTime(item.occurredAt), className: "whitespace-nowrap" },
    {
      key: "actor",
      header: "Usuario",
      cell: (item) =>
        item.actor ? (
          <span className="flex flex-col">
            <span>{item.actor.fullName}</span>
            <span className="text-xs text-fg-muted">{item.actor.username}</span>
          </span>
        ) : (
          EMPTY_VALUE
        ),
    },
    { key: "action", header: "Acción", cell: (item) => actionLabel(item.action) },
    { key: "entity", header: "Entidad", cell: (item) => <EntityCell item={item} />, className: "min-w-48" },
    { key: "ip", header: "IP", cell: (item) => displayValue(item.ipAddress), className: "whitespace-nowrap" },
    {
      key: "details",
      header: "Detalle",
      cell: (item) => {
        if (item.details === null) return EMPTY_VALUE;
        const open = expanded.has(item.id);
        return (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? detailId(item.id) : undefined}
            onClick={() => toggle(item.id)}
            className={`${actionClasses()} whitespace-nowrap`}
          >
            {open ? "Ocultar detalle" : "Ver detalle"}
          </button>
        );
      },
    },
  ];

  let content;
  if (rangeError) content = null;
  else if ((failure && failure.fieldErrors?.to === undefined) || (usersQuery.isError && !usersForbidden)) {
    content = (
      <ErrorState
        onRetry={() => {
          if (logsQuery.isError) void logsQuery.refetch();
          if (usersQuery.isError) void usersQuery.refetch();
        }}
      />
    );
  } else if (failure) content = null;
  else if (!logsQuery.data) content = <LoadingState />;
  else if (logsQuery.data.items.length === 0) content = <EmptyState />;
  else {
    const { data } = logsQuery;
    content = (
      <>
        <DataTable
          label={TITLE}
          columns={columns}
          rows={data.items}
          rowKey={(item) => item.id}
          busy={logsQuery.isPlaceholderData}
          renderExpanded={(item) =>
            expanded.has(item.id) && item.details !== null ? (
              <pre
                id={detailId(item.id)}
                className="rounded-lg border border-border bg-surface p-3 font-mono text-xs break-all whitespace-pre-wrap text-fg"
              >
                {JSON.stringify(item.details, null, 2)}
              </pre>
            ) : null
          }
        />
        <Pagination
          page={filters.page}
          pageSize={filters.pageSize}
          total={data.total}
          onPageChange={(page) => update({ page: page === 1 ? null : page })}
          onPageSizeChange={(size) => update({ pageSize: size === DEFAULT_PAGE_SIZE ? null : size })}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <TextField
          label="Desde"
          type="date"
          value={filters.from ?? ""}
          onChange={(event) => update({ from: event.target.value }, { keepEmpty: DATE_KEYS })}
        />
        <TextField
          label="Hasta"
          type="date"
          value={filters.to ?? ""}
          error={toError}
          onChange={(event) => update({ to: event.target.value }, { keepEmpty: DATE_KEYS })}
        />
        <Select
          label="Usuario"
          placeholder="Todos"
          options={userOptions(users, filters.actorUserId, logsQuery.data?.items ?? [])}
          value={filters.actorUserId ?? ""}
          onChange={(event) => update({ actorUserId: event.target.value })}
        />
        <Select
          label="Acción"
          placeholder="Todos"
          options={AUDIT_ACTIONS.map((action) => ({ value: action, label: AUDIT_ACTION_LABELS[action] }))}
          value={filters.action ?? ""}
          onChange={(event) => update({ action: event.target.value })}
        />
        <Select
          label="Tipo de entidad"
          placeholder="Todos"
          options={AUDIT_ENTITY_TYPES.map((type) => ({ value: type, label: ENTITY_TYPES[type].label }))}
          value={filters.entityType ?? ""}
          onChange={(event) => update({ entityType: event.target.value })}
        />
      </div>
      {content}
    </>
  );
}

function detailId(id: string): string {
  return `detalle-${id}`;
}

/** Tipo de entidad (Anexo A.5) y su id como enlace al detalle; un registro eliminado muestra el 404 de la API. */
function EntityCell({ item }: { item: AuditLogItem }) {
  if (item.entityType === null) return EMPTY_VALUE;
  const type = entityType(item.entityType);
  return (
    <span className="flex flex-col">
      <span>{type?.label ?? item.entityType}</span>
      {item.entityId !== null &&
        (type ? (
          <Link to={`${type.path}/${item.entityId}`} className="font-mono text-xs break-all text-primary-text underline underline-offset-2">
            {item.entityId}
          </Link>
        ) : (
          <span className="font-mono text-xs break-all">{item.entityId}</span>
        ))}
    </span>
  );
}
