import { Link } from "react-router";
import { RecordName } from "../../components/RecordName";
import { actionClasses } from "../../components/styles";
import type { UserStatus } from "../../lib/api";
import type { UserAction, UserActionTarget } from "./useUserActions";

interface UserActionButtonsProps {
  user: UserActionTarget & { status: UserStatus };
  /** La fila del propio usuario oculta Desactivar, Eliminar y Generar contraseña temporal (sección 8.6). */
  isSelf: boolean;
  onAction: (action: UserAction, user: UserActionTarget) => void;
  disabled?: boolean;
  /** "Ver" solo en la lista (en el detalle ya se está viendo). */
  showView?: boolean;
}

/**
 * Acciones según el estado (sección 8.6): Ver, Editar, Activar o Desactivar, Desbloquear (si está bloqueado),
 * Generar contraseña temporal y Eliminar. Cada una lleva el usuario como sufijo para lectores de pantalla.
 */
export function UserActionButtons({ user, isSelf, onAction, disabled = false, showView = true }: UserActionButtonsProps) {
  const target = { id: user.id, username: user.username };
  const button = (action: UserAction, label: string, tone: "default" | "danger" = "default") => (
    <button type="button" disabled={disabled} onClick={() => onAction(action, target)} className={actionClasses(tone)}>
      {label}
      <RecordName name={user.username} />
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1">
      {showView && (
        <Link to={`/usuarios/${user.id}`} className={actionClasses()}>
          Ver
          <RecordName name={user.username} />
        </Link>
      )}
      <Link to={`/usuarios/${user.id}/editar`} className={actionClasses()}>
        Editar
        <RecordName name={user.username} />
      </Link>
      {user.status === "INACTIVO" ? button("activate", "Activar") : !isSelf && button("deactivate", "Desactivar")}
      {user.status === "BLOQUEADO" && button("unlock", "Desbloquear")}
      {!isSelf && button("resetPassword", "Generar contraseña temporal")}
      {!isSelf && button("delete", "Eliminar", "danger")}
    </div>
  );
}
