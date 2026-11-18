import type { Ref } from "react";
import { ErrorState } from "../../components/ErrorState";
import { Select } from "../../components/Select";
import type { CodeName } from "../../lib/api";
import { useDepartments, useDistricts, useProvinces } from "./queries";

export interface UbigeoValue {
  departmentCode: string;
  provinceCode: string;
  districtUbigeo: string;
}

interface UbigeoSelectsProps {
  value: UbigeoValue;
  /** Cambiar el departamento limpia provincia y distrito; cambiar la provincia limpia el distrito (sección 8.6). */
  onChange: (value: UbigeoValue) => void;
  /** Filtros de la lista ("Todos", sin obligatorios) o formulario ("Selecciona", obligatorios). */
  mode: "filter" | "form";
  errors?: Partial<Record<keyof UbigeoValue, string | undefined>>;
  /** En el formulario, `{ ref }` de react-hook-form por campo: así enfoca el primer campo con error. */
  registered?: Partial<Record<keyof UbigeoValue, { ref: Ref<HTMLSelectElement> }>>;
}

function options(items: readonly CodeName[] | undefined) {
  return (items ?? []).map((item) => ({ value: item.code, label: item.name }));
}

/**
 * Departamento → Provincia → Distrito encadenados (secciones 6.7 y 8.6). Cada nivel se habilita cuando el anterior
 * tiene valor; las listas se piden a la API una vez por código (catálogo fijo).
 */
export function UbigeoSelects({ value, onChange, mode, errors = {}, registered = {} }: UbigeoSelectsProps) {
  const departments = useDepartments();
  const provinces = useProvinces(value.departmentCode);
  const districts = useDistricts(value.provinceCode);
  const form = mode === "form";
  const placeholder = form ? "Selecciona" : "Todos";
  const failed = [departments, provinces, districts].filter((query) => query.isError);

  return (
    <>
      <Select
        label="Departamento"
        requiredMark={form}
        placeholder={placeholder}
        options={options(departments.data)}
        value={value.departmentCode}
        error={errors.departmentCode}
        {...registered.departmentCode}
        onChange={(event) => onChange({ departmentCode: event.target.value, provinceCode: "", districtUbigeo: "" })}
      />
      <Select
        label="Provincia"
        requiredMark={form}
        placeholder={placeholder}
        options={options(provinces.data)}
        value={value.provinceCode}
        disabled={value.departmentCode === ""}
        error={errors.provinceCode}
        {...registered.provinceCode}
        onChange={(event) => onChange({ ...value, provinceCode: event.target.value, districtUbigeo: "" })}
      />
      <Select
        label="Distrito"
        requiredMark={form}
        placeholder={placeholder}
        options={options(districts.data)}
        value={value.districtUbigeo}
        disabled={value.provinceCode === ""}
        error={errors.districtUbigeo}
        {...registered.districtUbigeo}
        onChange={(event) => onChange({ ...value, districtUbigeo: event.target.value })}
      />
      {failed.length > 0 && (
        <div className="sm:col-span-full">
          <ErrorState onRetry={() => failed.forEach((query) => void query.refetch())} />
        </div>
      )}
    </>
  );
}
