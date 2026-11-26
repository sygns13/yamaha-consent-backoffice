import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { buttonClasses } from "../../components/styles";
import { useToast } from "../../components/Toast";
import { createDealer, type DealerCreateRequest } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { applyFieldErrors } from "../../lib/forms";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { DealerFields } from "./DealerFields";
import { dealerKeys } from "./queries";
import { DEALER_FORM_FIELDS, dealerFormSchema, EMPTY_DEALER_FORM, toCreateRequest } from "./schema";

const TITLE = "Nuevo dealer";
const schema = dealerFormSchema("create");

/** Dealers — alta (sección 8.6). `409` de código duplicado y `422` del servidor van a su campo. Éxito → detalle. */
export function DealerCreatePage() {
  useDocumentTitle(TITLE);
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY_DEALER_FORM });

  const mutation = useMutation({
    mutationFn: async (body: DealerCreateRequest) => unwrap(await createDealer(body)),
    onSuccess: (dealer) => {
      client.setQueryData(dealerKeys.detail(dealer.id), dealer);
      void client.invalidateQueries({ queryKey: dealerKeys.lists });
      toast.show("Dealer registrado correctamente.", "success");
      void navigate(`/dealers/${dealer.id}`);
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (isHttpStatus(failure, 401)) return;
      const fieldError = failure.status === 409 || failure.status === 422;
      if (!(fieldError && applyFieldErrors(form.setError, failure, DEALER_FORM_FIELDS))) setFormError(failureMessage(failure));
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(toCreateRequest(values));
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title={TITLE} />
      {/* Spec de rediseño, 6.4: una tarjeta con la leyenda, las secciones (P2) y el pie con las acciones. */}
      <form noValidate onSubmit={(event) => void onSubmit(event)}>
        <Card
          footer={
            <>
              <Button type="submit" loading={mutation.isPending} loadingText="Guardando...">
                Guardar
              </Button>
              <Link to="/dealers" className={buttonClasses("secondary")}>
                Cancelar
              </Link>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <p className="text-xs text-fg-muted">* Campo obligatorio</p>
            <DealerFields form={form} />
          </div>
          <Alert variant="error" className="mt-6">
            {formError}
          </Alert>
        </Card>
      </form>
    </div>
  );
}
