import { Eye, KeyRound, LockOpen, Pencil, Trash, UserCheck, UserX, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../components/Button";
import { RecordName } from "../../components/RecordName";
import { RowActionsMenu } from "../../components/RowActionsMenu";
import { actionClasses, buttonClasses } from "../../components/styles";
import type { UserStatus } from "../../lib/api";
import type { UserAction, UserActionTarget } from "./useUserActions";

interface UserActionButtonsProps {
  user: UserActionTarget & { status: UserStatus };
  /** La fila del propio usuario oculta Desactivar, Eliminar y Generar contraseña temporal (sección 8.6). */
  isSelf: boolean;
  onAction: (action: UserAction, user: UserActionTarget) => void;
  disabled?: boolean;
  /**
   * `row` (lista): Ver y Editar visibles y el resto en "Más acciones" (spec de rediseño, D4; sin acciones, sin
   * disparador). `detail`: todas como botones (P1), sin "Ver" (ya se está viendo).
   */
  variant?: "row" | "detail";
}

interface StatusAction {
  action: UserAction;
  label: string;
  icon: LucideIcon;
  tone: "default" | "danger";
}

/**
 * Acciones según el estado (sección 8.6), en este orden: Activar o Desactivar, Desbloquear (si está bloqueado),
 * Generar contraseña temporal y Eliminar. En la fila propia no hay Desactivar, Generar contraseña temporal ni Eliminar.
 * Una sola fuente para la lista y el detalle.
 */
function statusActions(status: UserStatus, isSelf: boolean): StatusAction[] {
  const actions: StatusAction[] = [];
  if (status === "INACTIVO") actions.push({ action: "activate", label: "Activar", icon: UserCheck, tone: "default" });
  else if (!isSelf) actions.push({ action: "deactivate", label: "Desactivar", icon: UserX, tone: "default" });
  if (status === "BLOQUEADO") actions.push({ action: "unlock", label: "Desbloquear", icon: LockOpen, tone: "default" });
  if (!isSelf) {
    actions.push({ action: "resetPassword", label: "Generar contraseña temporal", icon: KeyRound, tone: "default" });
    actions.push({ action: "delete", label: "Eliminar", icon: Trash, tone: "danger" });
  }
  return actions;
}

/** Acciones de un usuario. Cada una lleva el usuario como sufijo para lectores de pantalla ("Desactivar jperez"). */
export function UserActionButtons({ user, isSelf, onAction, disabled = false, variant = "row" }: UserActionButtonsProps) {
  const target = { id: user.id, username: user.username };
  const actions = statusActions(user.status, isSelf);
  const editPath = `/usuarios/${user.id}/editar`;

  if (variant === "detail") {
    return (
      <>
        <Link to={editPath} className={buttonClasses("secondary", undefined, "sm")}>
          <Pencil className="size-4 shrink-0" />
          Editar
          <RecordName name={user.username} />
        </Link>
        {actions.map(({ action, label, icon: Icon, tone }) =>
          tone === "danger" ? (
            <button
              key={action}
              type="button"
              disabled={disabled}
              onClick={() => onAction(action, target)}
              className={actionClasses("danger")}
            >
              <Icon className="size-4 shrink-0" />
              {label}
              <RecordName name={user.username} />
            </button>
          ) : (
            <Button
              key={action}
              variant="secondary"
              size="sm"
              icon={Icon}
              disabled={disabled}
              onClick={() => onAction(action, target)}
            >
              {label}
              <RecordName name={user.username} />
            </Button>
          ),
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link to={`/usuarios/${user.id}`} className={actionClasses()}>
        <Eye className="size-4 shrink-0" />
        Ver
        <RecordName name={user.username} />
      </Link>
      <Link to={editPath} className={actionClasses()}>
        <Pencil className="size-4 shrink-0" />
        Editar
        <RecordName name={user.username} />
      </Link>
      <RowActionsMenu
        name={user.username}
        disabled={disabled}
        items={actions.map(({ action, label, icon, tone }) => ({
          key: action,
          label,
          icon,
          tone,
          onSelect: () => onAction(action, target),
        }))}
      />
    </div>
  );
}
