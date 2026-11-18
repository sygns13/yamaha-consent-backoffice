import { describe, expect, it } from "vitest";
import { contactPhoneError, normalizeContactPhone } from "../../lib/validators/phone";
import { dealerFormSchema, EMPTY_DEALER_FORM, toCreateRequest, toUpdateRequest, type DealerFormValues } from "./schema";

const VALID: DealerFormValues = {
  dealerCode: "CL0001",
  businessName: "",
  ruc: "20100047218",
  address: "Av. Ejemplo 123",
  departmentCode: "15",
  provinceCode: "1501",
  districtUbigeo: "150101",
  contactEmail: "contacto@abcmotors.pe",
  contactPhone: "",
  contactName: "",
};

function errors(values: DealerFormValues, mode: "create" | "edit" = "create") {
  const result = dealerFormSchema(mode).safeParse(values);
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));
}

describe("dealerFormSchema (sección 6.6)", () => {
  it("válido; razón social, teléfono y persona de contacto son opcionales", () => {
    expect(errors(VALID)).toEqual({});
  });

  it("obligatorios → 'Campo obligatorio' (también el ubigeo)", () => {
    expect(errors(EMPTY_DEALER_FORM)).toEqual({
      dealerCode: "Campo obligatorio",
      ruc: "Campo obligatorio",
      address: "Campo obligatorio",
      departmentCode: "Campo obligatorio",
      provinceCode: "Campo obligatorio",
      districtUbigeo: "Campo obligatorio",
      contactEmail: "Campo obligatorio",
    });
  });

  it("mismos casos y mensajes que la API (test_bo_dealers.py::test_create_dealer_validation)", () => {
    expect(
      errors({
        ...VALID,
        dealerCode: "C".repeat(101),
        businessName: "B".repeat(251),
        ruc: "20100047219",
        address: "A".repeat(251),
        contactEmail: "no-es-un-correo",
        contactPhone: "12345",
        contactName: "a".repeat(151),
      }),
    ).toEqual({
      dealerCode: "El código del dealer no puede tener más de 100 caracteres",
      businessName: "Debe tener como máximo 250 caracteres",
      ruc: "El RUC no es válido.",
      address: "Debe tener como máximo 250 caracteres",
      contactEmail: "El correo no tiene un formato válido.",
      contactPhone: "El teléfono debe tener entre 6 y 15 dígitos.",
      contactName: "Debe tener como máximo 150 caracteres",
    });
  });

  it("al editar, el código no se valida (no se envía)", () => {
    expect(errors({ ...VALID, dealerCode: "" }, "edit")).toEqual({});
  });
});

describe("teléfono de contacto (sección 4.3, propuesta)", () => {
  it.each([
    ["014567890", "014567890"],
    ["+51 1 456.7890", "+5114567890"],
    ["(01) 456-7890", "014567890"],
  ])("normalizeContactPhone(%j) → %j y es válido", (value, expected) => {
    expect(normalizeContactPhone(value)).toBe(expected);
    expect(contactPhoneError(value)).toBeNull();
  });

  it.each(["12345", "1234567890123456", "01-456-789 anexo 2", "01+4567890"])("%j → mensaje del Anexo A.3", (value) => {
    expect(contactPhoneError(value)).toBe("El teléfono debe tener entre 6 y 15 dígitos.");
  });

  it("vacío o solo separadores → sin teléfono", () => {
    expect(contactPhoneError("")).toBeNull();
    expect(contactPhoneError(" - ")).toBeNull();
  });
});

describe("requests", () => {
  it("alta: opcionales vacíos → null; el ubigeo va solo como distrito", () => {
    expect(toCreateRequest(VALID)).toEqual({
      dealerCode: "CL0001",
      businessName: null,
      ruc: "20100047218",
      address: "Av. Ejemplo 123",
      districtUbigeo: "150101",
      contactEmail: "contacto@abcmotors.pe",
      contactPhone: null,
      contactName: null,
    });
  });

  it("edición: sin código, con la versión (reemplazo completo)", () => {
    const body = toUpdateRequest({ ...VALID, contactName: "María López" }, 4);
    expect(body).not.toHaveProperty("dealerCode");
    expect(body).toMatchObject({ contactName: "María López", businessName: null, version: 4 });
  });
});
