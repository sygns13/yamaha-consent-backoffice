import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { activateUser, deactivateUser, deleteUser, resetUserPassword, unlockUser, type UserDetail } from "../../lib/api";
import { failureMessage, failureOf, isHttpStatus, unwrap } from "../../lib/errors";
import { userKeys } from "./queries";
import { TemporaryPasswordModal } from "./TemporaryPasswordModal";

export type UserAction = "activate" | "deactivate" | "unlock" | "resetPassword" | "delete";

export interface UserActionTarget {
  id: string;
  username: string;
}

/** Acciones con `ConfirmDialog` (Anexo A.2). Activar y Desbloquear van sin confirmación (decisión D4, spec v1.5). */
type ConfirmableAction = "deactivate" | "resetPassword" | "delete";

const CONFIRMATIONS: Record<ConfirmableAction, { label: string; message: (username: string) => string }> = {
  deactivate: {
    label: "Desactivar",
    message: (username) => `¿Desactivar a ${username}? No podrá iniciar sesión y se cerrarán sus sesiones activas.`,
  },
  resetPassword: {
    label: "Generar contraseña temporal",
    message: (username) =>
      `Se generará una nueva contraseña temporal para ${username} y se cerrarán sus sesiones activas. ¿Continuar?`,
  },
  delete: {
    label: "Eliminar",
    message: (username) => `¿Eliminar a ${username}? Dejará de mostrarse y se cerrarán sus sesiones activas.`,
  },
};

function isConfirmable(action: UserAction): action is ConfirmableAction {
  return action in CONFIRMATIONS;
}

const SAVED_MESSAGE = "Los cambios se guardaron correctamente.";
const DELETED_MESSAGE = "Usuario eliminado.";

type ActionResult = { kind: "detail"; user: UserDetail } | { kind: "password"; password: string } | { kind: "deleted" };

async function runAction(action: UserAction, userId: string): Promise<ActionResult> {
  switch (action) {
    case "activate":
      return { kind: "detail", user: unwrap(await activateUser(userId)) };
    case "deactivate":
      return { kind: "detail", user: unwrap(await deactivateUser(userId)) };
    case "unlock":
      return { kind: "detail", user: unwrap(await unlockUser(userId)) };
    case "resetPassword":
      return { kind: "password", password: unwrap(await resetUserPassword(userId)).temporaryPassword };
    case "delete":
      unwrap(await deleteUser(userId));
      return { kind: "deleted" };
  }
}

/**
 * Acciones sobre un usuario (sección 6.5), compartidas por la lista y el detalle: confirmación, llamada, aviso y
 * caché. Devuelve `run` para los botones, la acción en curso y los diálogos que la pantalla debe montar.
 * Un error (p. ej. `409 LAST_ADMIN`, `404`) se muestra en un aviso con el `detail` de la API.
 */
export function useUserActions(options: { onDeleted?: () => void } = {}) {
  const client = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState<{ action: ConfirmableAction; user: UserActionTarget } | null>(null);
  const [temporary, setTemporary] = useState<{ username: string; password: string } | null>(null);

  const mutation = useMutation({
    mutationFn: ({ action, user }: { action: UserAction; user: UserActionTarget }) => runAction(action, user.id),
    onSuccess: (result, { user }) => {
      setConfirming(null);
      if (result.kind === "deleted") {
        toast.show(DELETED_MESSAGE, "success");
        options.onDeleted?.();
        client.removeQueries({ queryKey: userKeys.detail(user.id) });
      } else if (result.kind === "password") {
        setTemporary({ username: user.username, password: result.password });
        void client.invalidateQueries({ queryKey: userKeys.detail(user.id) });
      } else {
        client.setQueryData(userKeys.detail(user.id), result.user);
        toast.show(SAVED_MESSAGE, "success");
      }
      void client.invalidateQueries({ queryKey: userKeys.lists });
      void client.invalidateQueries({ queryKey: ["users", "all"] });
    },
    onError: (error, { user }) => {
      setConfirming(null);
      const failure = failureOf(error);
      // 401: el manejo global ya manda al login.
      if (isHttpStatus(failure, 401)) return;
      toast.show(failureMessage(failure), "error");
      void client.invalidateQueries({ queryKey: userKeys.lists });
      void client.invalidateQueries({ queryKey: userKeys.detail(user.id) });
    },
  });

  const run = (action: UserAction, user: UserActionTarget) => {
    if (isConfirmable(action)) setConfirming({ action, user });
    else mutation.mutate({ action, user });
  };

  const confirmation = confirming ? CONFIRMATIONS[confirming.action] : null;
  const dialogs = (
    <>
      <ConfirmDialog
        open={confirming !== null}
        title={confirmation?.label ?? ""}
        message={confirming && confirmation ? confirmation.message(confirming.user.username) : ""}
        confirmLabel={confirmation?.label ?? ""}
        pending={mutation.isPending}
        onConfirm={() => confirming && mutation.mutate(confirming)}
        onCancel={() => setConfirming(null)}
      />
      <TemporaryPasswordModal
        open={temporary !== null}
        username={temporary?.username ?? ""}
        password={temporary?.password ?? ""}
        onClose={() => setTemporary(null)}
      />
    </>
  );

  return {
    run,
    /** Usuario sobre el que hay una acción en curso (sus botones quedan deshabilitados). */
    pendingUserId: mutation.isPending ? mutation.variables.user.id : null,
    dialogs,
  };
}
