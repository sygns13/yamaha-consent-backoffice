import { useWatch, type UseFormReturn } from "react-hook-form";
import { CardSection, CardSections } from "../../components/Card";
import { TextField } from "../../components/TextField";
import type { DealerFormValues } from "./schema";
import { UbigeoSelects, type UbigeoValue } from "./UbigeoSelects";

const UBIGEO_KEYS = ["departmentCode", "provinceCode", "districtUbigeo"] as const;

interface DealerFieldsProps {
  form: UseFormReturn<DealerFormValues>;
  /** Al editar, el código se muestra deshabilitado (no se envía; sección 6.6). */
  fixedDealerCode?: string;
}

/**
 * Campos del formulario de dealer en el orden de la sección 8.6 (textos del Anexo A.2), agrupados en las secciones
 * "Datos del dealer", "Ubicación" y "Contacto" (spec de rediseño, P2 y Anexo A). El orden de los campos no cambia.
 */
export function DealerFields({ form, fixedDealerCode }: DealerFieldsProps) {
  const { errors, isSubmitted } = form.formState;
  const [departmentCode, provinceCode, districtUbigeo] = useWatch({ control: form.control, name: UBIGEO_KEYS });

  const setUbigeo = (next: UbigeoValue) => {
    for (const key of UBIGEO_KEYS) {
      form.setValue(key, next[key], { shouldDirty: true, shouldValidate: isSubmitted });
    }
  };

  return (
    <CardSections>
      <CardSection title="Datos del dealer">
        {fixedDealerCode === undefined ? (
          <TextField
            label="Código del dealer"
            requiredMark
            autoComplete="off"
            spellCheck={false}
            error={errors.dealerCode?.message}
            {...form.register("dealerCode")}
          />
        ) : (
          <TextField label="Código del dealer" value={fixedDealerCode} disabled readOnly />
        )}
        <TextField
          label="Razón social"
          hint="Opcional. KIZUNA envía su propio nombre del dealer."
          autoComplete="off"
          error={errors.businessName?.message}
          {...form.register("businessName")}
        />
        <TextField label="RUC" requiredMark inputMode="numeric" autoComplete="off" error={errors.ruc?.message} {...form.register("ruc")} />
      </CardSection>
      <CardSection title="Ubicación">
        <div className="sm:col-span-2">
          <TextField label="Dirección" requiredMark autoComplete="off" error={errors.address?.message} {...form.register("address")} />
        </div>
        <UbigeoSelects
          mode="form"
          value={{ departmentCode, provinceCode, districtUbigeo }}
          onChange={setUbigeo}
          errors={{
            departmentCode: errors.departmentCode?.message,
            provinceCode: errors.provinceCode?.message,
            districtUbigeo: errors.districtUbigeo?.message,
          }}
          registered={{
            departmentCode: { ref: form.register("departmentCode").ref },
            provinceCode: { ref: form.register("provinceCode").ref },
            districtUbigeo: { ref: form.register("districtUbigeo").ref },
          }}
        />
      </CardSection>
      <CardSection title="Contacto">
        <TextField
          label="Correo de contacto"
          type="email"
          requiredMark
          autoComplete="off"
          spellCheck={false}
          error={errors.contactEmail?.message}
          {...form.register("contactEmail")}
        />
        <TextField
          label="Teléfono de contacto"
          type="tel"
          autoComplete="off"
          error={errors.contactPhone?.message}
          {...form.register("contactPhone")}
        />
        <TextField label="Persona de contacto" autoComplete="off" error={errors.contactName?.message} {...form.register("contactName")} />
      </CardSection>
    </CardSections>
  );
}
