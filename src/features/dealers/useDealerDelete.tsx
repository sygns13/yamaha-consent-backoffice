import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { deleteDealer } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { dealerKeys } from "./queries";

export interface DealerTarget {
  id: string;
  dealerCode: string;
}

/**
 * Eliminar un dealer (sección 8.6, textos del Anexo A.2): `ConfirmDialog` → `DELETE` → aviso "Dealer eliminado." y
 * recarga de la lista. Un error se avisa con el `detail` de la API. Lo usan la lista y el detalle.
 */
export function useDealerDelete(options: { onDeleted?: () => void } = {}) {
  const client = useQueryClient();
  const toast = useToast();
  const [target, setTarget] = useState<DealerTarget | null>(null);

  const mutation = useMutation({
    mutationFn: async (dealer: DealerTarget) => unwrap(await deleteDealer(dealer.id)),
    onSuccess: (_data, dealer) => {
      setTarget(null);
      toast.show("Dealer eliminado.", "success");
      options.onDeleted?.();
      client.removeQueries({ queryKey: dealerKeys.detail(dealer.id) });
      void client.invalidateQueries({ queryKey: dealerKeys.lists });
    },
    onError: (error, dealer) => {
      setTarget(null);
      const failure = failureOf(error);
      // 401: el manejo global ya manda al login.
      if (isHttpStatus(failure, 401)) return;
      toast.show(failureMessage(failure), "error");
      void client.invalidateQueries({ queryKey: dealerKeys.lists });
      void client.invalidateQueries({ queryKey: dealerKeys.detail(dealer.id) });
    },
  });

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      title={target ? `¿Eliminar el dealer ${target.dealerCode}?` : ""}
      message="Dejará de mostrarse en el BackOffice. Esta acción no se puede deshacer desde aquí."
      confirmLabel="Eliminar"
      pending={mutation.isPending}
      onConfirm={() => target && mutation.mutate(target)}
      onCancel={() => setTarget(null)}
    />
  );

  return {
    request: (dealer: DealerTarget) => setTarget(dealer),
    pendingDealerId: mutation.isPending ? mutation.variables.id : null,
    dialog,
  };
}
