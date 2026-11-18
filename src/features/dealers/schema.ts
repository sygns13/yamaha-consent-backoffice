/**
 * Formulario de dealer (sección 6.6) con zod: espejo de las validaciones de la API, con sus mensajes (Anexo A.3),
 * incluido el dígito verificador del RUC (Anexo B). El servidor normaliza y valida de nuevo; sus 409/422 van al campo.
 */
import { z } from "zod";
import type { DealerCreateRequest, DealerDetail, DealerUpdateRequest } from "../../lib/api";
import { maxLengthMessage } from "../../lib/errors";
import { emptyToNull, optionalField, requiredField } from "../../lib/fieldSchemas";
import { contactPhoneError } from "../../lib/validators/phone";
import { rucError } from "../../lib/validators/ruc";
import { emailError, normalizeText, personNameError, textLength } from "../../lib/validators/text";

const DEALER_CODE_MAX_LENGTH = 100;
const BUSINESS_NAME_MAX_LENGTH = 250;
const ADDRESS_MAX_LENGTH = 250;
const CONTACT_NAME_MAX_LENGTH = 150;

/** `validate_dealer` (v1.4): solo trim; su mensaje de largo no lleva punto (es parte del contrato de KIZUNA). */
function dealerCodeError(value: string): string | null {
  return textLength(value.trim()) > DEALER_CODE_MAX_LENGTH
    ? `El código del dealer no puede tener más de ${DEALER_CODE_MAX_LENGTH} caracteres`
    : null;
}

function maxTextError(max: number) {
  return (value: string) => (textLength(normalizeText(value)) > max ? maxLengthMessage(max) : null);
}

export function dealerFormSchema(mode: "create" | "edit") {
  return z.object({
    // Al editar, el código no se envía ni se valida (es inmutable, sección 6.6).
    dealerCode: mode === "create" ? requiredField(dealerCodeError) : z.string(),
    businessName: optionalField(maxTextError(BUSINESS_NAME_MAX_LENGTH)),
    ruc: requiredField(rucError),
    address: requiredField(maxTextError(ADDRESS_MAX_LENGTH)),
    // Departamento y provincia solo encadenan los selects; a la API va el distrito.
    departmentCode: requiredField(),
    provinceCode: requiredField(),
    districtUbigeo: requiredField(),
    contactEmail: requiredField(emailError),
    contactPhone: optionalField(contactPhoneError),
    contactName: optionalField((value) => personNameError(value, CONTACT_NAME_MAX_LENGTH)),
  });
}

export type DealerFormValues = z.infer<ReturnType<typeof dealerFormSchema>>;

/** Campos que pueden traer un error de la API (`field` o `loc`, en camelCase). */
export const DEALER_FORM_FIELDS = [
  "dealerCode",
  "businessName",
  "ruc",
  "address",
  "districtUbigeo",
  "contactEmail",
  "contactPhone",
  "contactName",
] as const;

export const EMPTY_DEALER_FORM: DealerFormValues = {
  dealerCode: "",
  businessName: "",
  ruc: "",
  address: "",
  departmentCode: "",
  provinceCode: "",
  districtUbigeo: "",
  contactEmail: "",
  contactPhone: "",
  contactName: "",
};

export function dealerToFormValues(dealer: DealerDetail): DealerFormValues {
  return {
    dealerCode: dealer.dealerCode,
    businessName: dealer.businessName ?? "",
    ruc: dealer.ruc,
    address: dealer.address,
    departmentCode: dealer.department.code,
    provinceCode: dealer.province.code,
    districtUbigeo: dealer.district.code,
    contactEmail: dealer.contactEmail,
    contactPhone: dealer.contactPhone ?? "",
    contactName: dealer.contactName ?? "",
  };
}

function editableFields(values: DealerFormValues) {
  return {
    businessName: emptyToNull(values.businessName),
    ruc: values.ruc,
    address: values.address,
    districtUbigeo: values.districtUbigeo,
    contactEmail: values.contactEmail,
    contactPhone: emptyToNull(values.contactPhone),
    contactName: emptyToNull(values.contactName),
  };
}

export function toCreateRequest(values: DealerFormValues): DealerCreateRequest {
  return { dealerCode: values.dealerCode, ...editableFields(values) };
}

/** PUT es un reemplazo completo: los opcionales vacíos se borran (sección 6.6). */
export function toUpdateRequest(values: DealerFormValues, version: number): DealerUpdateRequest {
  return { ...editableFields(values), version };
}
