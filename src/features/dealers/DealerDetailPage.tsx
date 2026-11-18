import { useNavigate, useParams } from "react-router";
import { Alert } from "../../components/Alert";
import { DetailList } from "../../components/DetailList";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import type { DealerDetail } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { failureOf, isHttpStatus } from "../../lib/errors";
import { displayValue, userRefLabel } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { DealerActionButtons } from "./DealerActionButtons";
import { DEALER_DETAIL_TITLE, DEALER_NOT_FOUND, dealerLocation } from "./labels";
import { useDealer } from "./queries";
import { useDealerDelete } from "./useDealerDelete";

/**
 * Dealers — detalle (sección 8.6): todos los campos, la ubicación "Distrito, Provincia, Departamento (Ubigeo)",
 * autoría, Editar y Eliminar. Inexistente → el `detail` de la API (aprobado en el spec v1.5).
 */
export function DealerDetailPage() {
  useDocumentTitle(DEALER_DETAIL_TITLE);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = useDealer(id);
  const deletion = useDealerDelete({ onDeleted: () => void navigate("/dealers") });

  let content;
  const failure = query.isError ? failureOf(query.error) : null;
  if (failure && (isHttpStatus(failure, 404) || isHttpStatus(failure, 422))) {
    content = (
      <Alert variant="error" live={false}>
        {failure.detail && failure.status === 404 ? failure.detail : DEALER_NOT_FOUND}
      </Alert>
    );
  } else if (query.isError) {
    content = <ErrorState onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    content = <LoadingState />;
  } else {
    const dealer = query.data;
    content = (
      <div className="flex flex-col gap-6 rounded-lg bg-white p-6 shadow-sm">
        <DealerActionButtons
          dealer={dealer}
          onDelete={deletion.request}
          disabled={deletion.pendingDealerId === dealer.id}
          showView={false}
        />
        <DetailList items={detailItems(dealer)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={DEALER_DETAIL_TITLE} />
      {content}
      {deletion.dialog}
    </div>
  );
}

function detailItems(dealer: DealerDetail) {
  return [
    { label: "Código del dealer", value: dealer.dealerCode },
    { label: "Razón social", value: displayValue(dealer.businessName) },
    { label: "RUC", value: dealer.ruc },
    { label: "Dirección", value: dealer.address },
    { label: "Ubicación", value: dealerLocation(dealer) },
    { label: "Correo de contacto", value: dealer.contactEmail },
    { label: "Teléfono de contacto", value: displayValue(dealer.contactPhone) },
    { label: "Persona de contacto", value: displayValue(dealer.contactName) },
    { label: "Creado por", value: userRefLabel(dealer.createdBy) },
    { label: "Creado el", value: formatDateTime(dealer.createdAt) },
    { label: "Actualizado por", value: userRefLabel(dealer.updatedBy) },
    { label: "Actualizado el", value: formatDateTime(dealer.updatedAt) },
  ];
}
