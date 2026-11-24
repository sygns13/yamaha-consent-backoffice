import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { PageHeader } from "../../components/PageHeader";
import { buttonClasses } from "../../components/styles";
import { useToast } from "../../components/Toast";
import { updateDealer, type DealerDetail, type DealerUpdateRequest } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { DealerFields } from "./DealerFields";
import { DEALER_NOT_FOUND } from "./labels";
import { dealerKeys, useDealer } from "./queries";
import { DEALER_FORM_FIELDS, dealerFormSchema, dealerToFormValues, toUpdateRequest } from "./schema";

const TITLE = "Editar dealer";
const schema = dealerFormSchema("edit");

/** Dealers — edición (sección 8.6): código deshabilitado y ubigeo precargado. `VERSION_CONFLICT` → "Recargar". */
export function DealerEditPage() {
  useDocumentTitle(TITLE);
  const { id = "" } = useParams();
  const query = useDealer(id);

  let content;
  const failure = query.isError ? failureOf(query.error) : null;
  if (failure && (isHttpStatus(failure, 404) || isHttpStatus(failure, 422))) {
    content = (
      <Alert variant="error" live={false}>
        {failure.detail && failure.status === 404 ? failure.detail : DEALER_NOT_FOUND}
      </Alert>
    );
  } else if (query.isError) content = <ErrorState onRetry={() => void query.refetch()} />;
  else if (query.isPending) content = <LoadingState />;
  else content = <DealerEditForm dealer={query.data} reload={() => query.refetch()} />;

  return (
    <div className="max-w-3xl">
      <PageHeader title={TITLE} />
      <div className="rounded-lg bg-surface p-6 shadow-sm">{content}</div>
    </div>
  );
}

function DealerEditForm({ dealer, reload }: { dealer: DealerDetail; reload: () => Promise<{ data?: DealerDetail }> }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  // Versión de los datos cargados en el formulario: una consulta en segundo plano no la cambia (sección 4.1).
  const [loadedVersion, setLoadedVersion] = useState(dealer.version);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: dealerToFormValues(dealer) });

  const mutation = useMutation({
    mutationFn: async (body: DealerUpdateRequest) => unwrap(await updateDealer(dealer.id, body)),
    onSuccess: (updated) => {
      client.setQueryData(dealerKeys.detail(updated.id), updated);
      void client.invalidateQueries({ queryKey: dealerKeys.lists });
      toast.show("Dealer actualizado correctamente.", "success");
      void navigate(`/dealers/${updated.id}`);
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 401)) return;
      if (isHttpStatus(failure, 409, "VERSION_CONFLICT")) {
        setConflict(true);
        return;
      }
      const fieldError = failure.status === 409 || failure.status === 422;
      if (!(fieldError && applyFieldErrors(form.setError, failure, DEALER_FORM_FIELDS))) setFormError(failureMessage(failure));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setConflict(false);
    mutation.mutate(toUpdateRequest(values, loadedVersion));
  });

  // Conflicto de versión (Anexo A.2): "Recargar" trae el registro vigente y descarta lo escrito.
  const onReload = async () => {
    setReloading(true);
    const result = await reload();
    setReloading(false);
    if (result.data) {
      form.reset(dealerToFormValues(result.data));
      setLoadedVersion(result.data.version);
      setConflict(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
      <p className="text-sm text-fg-muted">* Campo obligatorio</p>
      <DealerFields form={form} fixedDealerCode={dealer.dealerCode} />
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
        <Link to={`/dealers/${dealer.id}`} className={buttonClasses("secondary")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
