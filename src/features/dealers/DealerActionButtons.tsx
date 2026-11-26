import { Eye, Pencil, Trash } from "lucide-react";
import { Link } from "react-router";
import { RecordName } from "../../components/RecordName";
import { RowActionsMenu } from "../../components/RowActionsMenu";
import { actionClasses, buttonClasses } from "../../components/styles";
import type { DealerTarget } from "./useDealerDelete";

interface DealerActionButtonsProps {
  dealer: DealerTarget;
  onDelete: (dealer: DealerTarget) => void;
  disabled?: boolean;
  /**
   * `row` (lista): Ver y Editar visibles y Eliminar en "Más acciones" (spec de rediseño, D4). `detail`: Editar y
   * Eliminar como botones (P1).
   */
  variant?: "row" | "detail";
}

/** Acciones de un dealer (sección 8.6): Ver, Editar y Eliminar, con el código como sufijo para lectores de pantalla. */
export function DealerActionButtons({ dealer, onDelete, disabled = false, variant = "row" }: DealerActionButtonsProps) {
  const editPath = `/dealers/${dealer.id}/editar`;

  if (variant === "detail") {
    return (
      <>
        <Link to={editPath} className={buttonClasses("secondary", undefined, "sm")}>
          <Pencil className="size-4 shrink-0" />
          Editar
          <RecordName name={dealer.dealerCode} />
        </Link>
        <button type="button" disabled={disabled} onClick={() => onDelete(dealer)} className={actionClasses("danger")}>
          <Trash className="size-4 shrink-0" />
          Eliminar
          <RecordName name={dealer.dealerCode} />
        </button>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link to={`/dealers/${dealer.id}`} className={actionClasses()}>
        <Eye className="size-4 shrink-0" />
        Ver
        <RecordName name={dealer.dealerCode} />
      </Link>
      <Link to={editPath} className={actionClasses()}>
        <Pencil className="size-4 shrink-0" />
        Editar
        <RecordName name={dealer.dealerCode} />
      </Link>
      <RowActionsMenu
        name={dealer.dealerCode}
        disabled={disabled}
        items={[{ key: "delete", label: "Eliminar", icon: Trash, tone: "danger", onSelect: () => onDelete(dealer) }]}
      />
    </div>
  );
}
