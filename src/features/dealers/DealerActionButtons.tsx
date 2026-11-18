import { Link } from "react-router";
import { RecordName } from "../../components/RecordName";
import { actionClasses } from "../../components/styles";
import type { DealerTarget } from "./useDealerDelete";

interface DealerActionButtonsProps {
  dealer: DealerTarget;
  onDelete: (dealer: DealerTarget) => void;
  disabled?: boolean;
  /** "Ver" solo en la lista. */
  showView?: boolean;
}

/** Acciones de un dealer (sección 8.6): Ver, Editar y Eliminar, con el código como sufijo para lectores de pantalla. */
export function DealerActionButtons({ dealer, onDelete, disabled = false, showView = true }: DealerActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {showView && (
        <Link to={`/dealers/${dealer.id}`} className={actionClasses()}>
          Ver
          <RecordName name={dealer.dealerCode} />
        </Link>
      )}
      <Link to={`/dealers/${dealer.id}/editar`} className={actionClasses()}>
        Editar
        <RecordName name={dealer.dealerCode} />
      </Link>
      <button type="button" disabled={disabled} onClick={() => onDelete(dealer)} className={actionClasses("danger")}>
        Eliminar
        <RecordName name={dealer.dealerCode} />
      </button>
    </div>
  );
}
