import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { SearchField } from "../../components/SearchField";
import { buttonClasses } from "../../components/styles";
import { useToast } from "../../components/Toast";
import { exportDealers, type DealerDetail, type DealerFilters, type DealerListParams, type DealerSort } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { saveFile } from "../../lib/download";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { displayValue } from "../../lib/format";
import {
  DEFAULT_PAGE_SIZE,
  nextSort,
  readPage,
  readPageSize,
  readSort,
  readText,
  useClampPage,
  useUrlParams,
} from "../../lib/listParams";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { DealerActionButtons } from "./DealerActionButtons";
import { useDealers } from "./queries";
import { UbigeoSelects } from "./UbigeoSelects";
import { useDealerDelete } from "./useDealerDelete";

const TITLE = "Dealers";
const DEALER_SORTS = ["dealerCode", "businessName", "ruc", "createdAt", "updatedAt"] as const satisfies readonly DealerSort[];
// Formato de los códigos de ubigeo (secciones 4.3 y 6.6): uno mal formado en la URL se ignora (la API daría 422).
const DEPARTMENT = /^[0-9]{2}$/;
const PROVINCE = /^[0-9]{4}$/;
const DISTRICT = /^[0-9]{6}$/;

function readCode(params: URLSearchParams, key: string, format: RegExp): string | undefined {
  const value = readText(params, key);
  return format.test(value) ? value : undefined;
}

/** Filtros, orden y página de la URL (sección 8.6: `?q=&departmentCode=&provinceCode=&districtUbigeo=&page=...`). */
function readDealerListParams(params: URLSearchParams): DealerListParams {
  return {
    q: readText(params, "q") || undefined,
    departmentCode: readCode(params, "departmentCode", DEPARTMENT),
    provinceCode: readCode(params, "provinceCode", PROVINCE),
    districtUbigeo: readCode(params, "districtUbigeo", DISTRICT),
    page: readPage(params),
    pageSize: readPageSize(params),
    ...readSort(params, DEALER_SORTS, "dealerCode"),
  };
}

/**
 * Dealers — lista (sección 8.6): búsqueda con *debounce*, Departamento → Provincia → Distrito, orden y página en la
 * URL; "Nuevo dealer" y "Exportar a Excel" (con los filtros y el orden activos; mientras descarga, "Exportando...").
 */
export function DealersListPage() {
  useDocumentTitle(TITLE);
  const toast = useToast();
  const [params, update] = useUrlParams();
  const listParams = readDealerListParams(params);
  const query = useDealers(listParams);
  const deletion = useDealerDelete();
  useClampPage(query.data, listParams.page, listParams.pageSize, update);

  const exportMutation = useMutation({
    mutationFn: async (filters: DealerFilters) => unwrap(await exportDealers(filters)),
    onSuccess: ({ blob, filename }) => saveFile(blob, filename),
    onError: (error) => {
      const failure = failureOf(error);
      // 401: el manejo global ya manda al login.
      if (!isHttpStatus(failure, 401)) toast.show(failureMessage(failure), "error");
    },
  });

  const onExport = () => {
    const { q, departmentCode, provinceCode, districtUbigeo, sortBy, sortOrder } = listParams;
    exportMutation.mutate({ q, departmentCode, provinceCode, districtUbigeo, sortBy, sortOrder });
  };

  const columns: Column<DealerDetail>[] = [
    { key: "dealerCode", header: "Código", sortKey: "dealerCode", cell: (dealer) => dealer.dealerCode },
    { key: "businessName", header: "Razón social", sortKey: "businessName", cell: (dealer) => displayValue(dealer.businessName) },
    { key: "ruc", header: "RUC", sortKey: "ruc", cell: (dealer) => dealer.ruc, className: "whitespace-nowrap" },
    { key: "district", header: "Distrito", cell: (dealer) => dealer.district.name },
    { key: "contactEmail", header: "Correo de contacto", cell: (dealer) => dealer.contactEmail },
    { key: "contactPhone", header: "Teléfono", cell: (dealer) => displayValue(dealer.contactPhone), className: "whitespace-nowrap" },
    {
      key: "updatedAt",
      header: "Actualizado",
      sortKey: "updatedAt",
      cell: (dealer) => formatDateTime(dealer.updatedAt),
      className: "whitespace-nowrap",
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (dealer) => (
        <DealerActionButtons dealer={dealer} onDelete={deletion.request} disabled={deletion.pendingDealerId === dealer.id} />
      ),
      className: "min-w-48",
    },
  ];

  let content;
  if (query.isError) content = <ErrorState onRetry={() => void query.refetch()} />;
  else if (query.isPending) content = <LoadingState />;
  else if (query.data.items.length === 0) content = <EmptyState />;
  else {
    const { data } = query;
    content = (
      <>
        <DataTable
          label={TITLE}
          columns={columns}
          rows={data.items}
          rowKey={(dealer) => dealer.id}
          sort={{ sortBy: listParams.sortBy, sortOrder: listParams.sortOrder }}
          onSort={(column) => update({ ...nextSort<DealerSort>(listParams, column as DealerSort) })}
          busy={query.isPlaceholderData}
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
          <>
            <Link to="/dealers/nuevo" className={buttonClasses()}>
              Nuevo dealer
            </Link>
            <Button variant="secondary" loading={exportMutation.isPending} loadingText="Exportando..." onClick={onExport}>
              Exportar a Excel
            </Button>
          </>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchField
          label="Buscar por código, razón social, RUC o contacto"
          value={listParams.q ?? ""}
          onSearch={(q) => update({ q })}
        />
        <UbigeoSelects
          mode="filter"
          value={{
            departmentCode: listParams.departmentCode ?? "",
            provinceCode: listParams.provinceCode ?? "",
            districtUbigeo: listParams.districtUbigeo ?? "",
          }}
          onChange={(ubigeo) => update({ ...ubigeo })}
        />
      </div>
      {content}
      {deletion.dialog}
    </>
  );
}
