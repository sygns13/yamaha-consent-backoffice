import { useNavigate, useParams } from "react-router";
import { backToModule } from "../../app/modules";
import { Alert } from "../../components/Alert";
import { Card } from "../../components/Card";
import { DetailList } from "../../components/DetailList";
import { ErrorState } from "../../components/ErrorState";
import { PageHeader } from "../../components/PageHeader";
import { DetailSkeleton } from "../../components/Skeleton";
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
 * autoría, Editar y Eliminar. Inexistente → el `detail` de la API (aprobado en el spec v1.5). Spec de rediseño, 6.5: las
 * acciones como botones en el encabezado (P1) y la autoría en un segundo bloque de la tarjeta.
 */
export function DealerDetailPage() {
  useDocumentTitle(DEALER_DETAIL_TITLE);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = useDealer(id);
  const deletion = useDealerDelete({ onDeleted: () => void navigate("/dealers") });

  let content;
  let actions;
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
    // Primera carga (4.10).
    content = (
      <Card>
        <DetailSkeleton items={8} />
      </Card>
    );
  } else {
    const dealer = query.data;
    actions = (
      <DealerActionButtons
        dealer={dealer}
        onDelete={deletion.request}
        disabled={deletion.pendingDealerId === dealer.id}
        variant="detail"
      />
    );
    content = (
      <Card>
        <DetailList items={detailItems(dealer)} />
        <div className="mt-6 border-t border-border pt-6">
          <DetailList items={authorshipItems(dealer)} />
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={DEALER_DETAIL_TITLE} actions={actions} back={backToModule("DEALERS")} />
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
  ];
}

/** Autoría (spec de rediseño, 6.5): segundo bloque de la tarjeta, sin encabezado. */
function authorshipItems(dealer: DealerDetail) {
  return [
    { label: "Creado por", value: userRefLabel(dealer.createdBy) },
    { label: "Creado el", value: formatDateTime(dealer.createdAt) },
    { label: "Actualizado por", value: userRefLabel(dealer.updatedBy) },
    { label: "Actualizado el", value: formatDateTime(dealer.updatedAt) },
  ];
}
