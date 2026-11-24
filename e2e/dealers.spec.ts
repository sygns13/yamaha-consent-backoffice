import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import {
  CREATED_DEALER_ID,
  DEALER_CALLAO,
  DEALER_LIMA,
  DEALERS,
  EXPORT_CONTENT,
  EXPORT_FILENAME,
  page as pageOf,
} from "./fixtures";
import { detailValue, field, heading, NETWORK_ERROR_TEXT } from "./helpers";
import { ADMIN, apiError, expect, ok, OPERATOR, test } from "./mock-api";

const SEARCH_LABEL = "Buscar por código, razón social, RUC o contacto";

test.beforeEach(({ api }) => {
  api.user = ADMIN;
});

function toast(page: Page, text: string) {
  return page.getByRole("status").getByText(text);
}

async function selectUbigeo(page: Page, department: string, province: string, district: string) {
  await field(page, "Departamento").selectOption({ label: department });
  await field(page, "Provincia").selectOption({ label: province });
  await field(page, "Distrito").selectOption({ label: district });
}

test.describe("Alta (B8.1 y B8.2)", () => {
  test("ubigeo encadenado, RUC validado en el cliente y alta → detalle", async ({ page, api }) => {
    api.respond("dealer", ok({ ...DEALER_CALLAO, id: CREATED_DEALER_ID, dealerCode: "CL0099" }));
    await page.goto("/dealers/nuevo");
    await expect(heading(page)).toHaveText("Nuevo dealer");
    await expect(page).toHaveTitle("Nuevo dealer · BackOffice Consentimientos");
    await expect(page.getByText("* Campo obligatorio")).toBeVisible();
    await expect(field(page, "Razón social")).toHaveAccessibleDescription("Opcional. KIZUNA envía su propio nombre del dealer.");

    // Provincia y distrito se habilitan en cadena; cambiar el departamento los limpia.
    await expect(field(page, "Provincia")).toBeDisabled();
    await expect(field(page, "Distrito")).toBeDisabled();
    await selectUbigeo(page, "LIMA", "CAÑETE", "SAN VICENTE DE CAÑETE");
    await expect(field(page, "Distrito")).toHaveValue("150501");
    await field(page, "Departamento").selectOption({ label: "CALLAO" });
    await expect(field(page, "Provincia")).toHaveValue("");
    await expect(field(page, "Distrito")).toHaveValue("");
    await expect(field(page, "Distrito")).toBeDisabled();
    expect(api.calls("ubigeoProvinces").map((call) => call.path)).toEqual([
      "/ubigeo/departments/15/provinces",
      "/ubigeo/departments/07/provinces",
    ]);

    // RUC: dígito verificador (Anexo B) y largo, sin llamar a la API.
    await field(page, "Código del dealer").fill("CL0099");
    await field(page, "RUC").fill("20100047219");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(field(page, "RUC")).toHaveAccessibleDescription("El RUC no es válido.");
    await expect(field(page, "Provincia")).toHaveAccessibleDescription("Campo obligatorio");
    await field(page, "RUC").fill("2010004721");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(field(page, "RUC")).toHaveAccessibleDescription("El RUC debe tener 11 dígitos.");
    expect(api.calls("dealerCreate")).toHaveLength(0);

    await field(page, "RUC").fill("201 0004 7218");
    await field(page, "Dirección").fill("Av. Ejemplo 123");
    await field(page, "Provincia").selectOption({ label: "CALLAO" });
    await field(page, "Distrito").selectOption({ label: "CALLAO" });
    await field(page, "Correo de contacto").fill("contacto@abcmotors.pe");
    await field(page, "Teléfono de contacto").fill("(01) 456-7890");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(new RegExp(`/dealers/${CREATED_DEALER_ID}$`));
    await expect(toast(page, "Dealer registrado correctamente.")).toBeVisible();
    await expect(heading(page)).toHaveText("Detalle del dealer");
    expect(api.calls("dealerCreate")[0]?.body).toEqual({
      dealerCode: "CL0099",
      businessName: null,
      ruc: "201 0004 7218",
      address: "Av. Ejemplo 123",
      districtUbigeo: "070101",
      contactEmail: "contacto@abcmotors.pe",
      contactPhone: "(01) 456-7890",
      contactName: null,
    });
  });

  test("409 de código duplicado y 422 del servidor en su campo", async ({ page, api }) => {
    api.respond(
      "dealerCreate",
      apiError(409, "DUPLICATE", "Ya existe un dealer con ese código.", "dealerCode"),
      apiError(422, "DISTRICT_NOT_FOUND", "El distrito seleccionado no existe.", "districtUbigeo"),
      { status: 422, body: { detail: [{ type: "value_error", loc: ["body", "contactName"], msg: "Debe tener como máximo 150 caracteres" }] } },
    );
    await page.goto("/dealers/nuevo");
    await field(page, "Código del dealer").fill("cl0001");
    await field(page, "RUC").fill("20100047218");
    await field(page, "Dirección").fill("Av. Ejemplo 123");
    await selectUbigeo(page, "LIMA", "LIMA", "LIMA");
    await field(page, "Correo de contacto").fill("contacto@abcmotors.pe");
    await field(page, "Persona de contacto").fill("María López");
    const save = page.getByRole("button", { name: "Guardar" });

    await save.click();
    await expect(field(page, "Código del dealer")).toHaveAccessibleDescription("Ya existe un dealer con ese código.");
    await expect(field(page, "Código del dealer")).toBeFocused();
    await save.click();
    await expect(field(page, "Distrito")).toHaveAccessibleDescription("El distrito seleccionado no existe.");
    await expect(field(page, "Distrito")).toBeFocused();
    await save.click();
    await expect(field(page, "Persona de contacto")).toHaveAccessibleDescription("Debe tener como máximo 150 caracteres");
    expect(api.calls("dealerCreate")).toHaveLength(3);
  });

  test("validación en el cliente con los mensajes de la API", async ({ page, api }) => {
    await page.goto("/dealers/nuevo");
    await page.getByRole("button", { name: "Guardar" }).click();
    for (const label of ["Código del dealer", "RUC", "Dirección", "Departamento", "Provincia", "Distrito", "Correo de contacto"]) {
      await expect(field(page, label)).toHaveAccessibleDescription("Campo obligatorio");
    }
    await expect(field(page, "Código del dealer")).toBeFocused();

    await field(page, "Código del dealer").fill("C".repeat(101));
    await field(page, "Correo de contacto").fill("contacto@");
    await field(page, "Teléfono de contacto").fill("01-456-789 anexo 2");
    await field(page, "Persona de contacto").fill("María 2");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(field(page, "Código del dealer")).toHaveAccessibleDescription(
      "El código del dealer no puede tener más de 100 caracteres",
    );
    await expect(field(page, "Correo de contacto")).toHaveAccessibleDescription("El correo no tiene un formato válido.");
    await expect(field(page, "Teléfono de contacto")).toHaveAccessibleDescription("El teléfono debe tener entre 6 y 15 dígitos.");
    await expect(field(page, "Persona de contacto")).toHaveAccessibleDescription(
      "El nombre solo puede contener letras, espacios, apóstrofo, punto y guion.",
    );
    expect(api.calls("dealerCreate")).toHaveLength(0);
  });
});

test.describe("Edición, detalle y eliminación (B8.3)", () => {
  test("edición: código deshabilitado, ubigeo precargado; PUT con la versión y los opcionales vacíos en null", async ({ page, api }) => {
    await page.goto(`/dealers/${DEALER_LIMA.id}/editar`);
    await expect(heading(page)).toHaveText("Editar dealer");
    await expect(field(page, "Código del dealer")).toBeDisabled();
    await expect(field(page, "Código del dealer")).toHaveValue("CL0001");
    await expect(field(page, "Departamento")).toHaveValue("15");
    await expect(field(page, "Provincia")).toHaveValue("1501");
    await expect(field(page, "Distrito")).toHaveValue("150101");

    await field(page, "Razón social").fill("");
    await field(page, "Provincia").selectOption({ label: "CAÑETE" });
    await expect(field(page, "Distrito")).toHaveValue("");
    await field(page, "Distrito").selectOption({ label: "SAN VICENTE DE CAÑETE" });
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(new RegExp(`/dealers/${DEALER_LIMA.id}$`));
    await expect(toast(page, "Dealer actualizado correctamente.")).toBeVisible();
    expect(api.calls("dealerUpdate")[0]?.body).toEqual({
      businessName: null,
      ruc: "20100047218",
      address: "Av. Ejemplo 123",
      districtUbigeo: "150501",
      contactEmail: "contacto@abcmotors.pe",
      contactPhone: "014567890",
      contactName: "María López",
      version: 1,
    });
  });

  test("VERSION_CONFLICT → aviso con 'Recargar'", async ({ page, api }) => {
    const newer = { ...DEALER_LIMA, address: "Av. Nueva 999", version: 2 };
    api.respond("dealer", ok(DEALER_LIMA), ok(newer));
    api.respond(
      "dealerUpdate",
      apiError(409, "VERSION_CONFLICT", "El registro fue modificado por otro usuario. Recarga la página e inténtalo de nuevo."),
      ok({ ...newer, version: 3 }),
    );
    await page.goto(`/dealers/${DEALER_LIMA.id}/editar`);
    await field(page, "Persona de contacto").fill("Rosa Ríos");
    await page.getByRole("button", { name: "Guardar" }).click();
    const notice = page.getByRole("alert").filter({ hasText: "El registro fue modificado por otro usuario." });
    await notice.getByRole("button", { name: "Recargar" }).click();
    await expect(field(page, "Dirección")).toHaveValue("Av. Nueva 999");
    await expect(field(page, "Persona de contacto")).toHaveValue("María López");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(toast(page, "Dealer actualizado correctamente.")).toBeVisible();
    expect(api.calls("dealerUpdate").map((call) => (call.body as { version: number }).version)).toEqual([1, 2]);
  });

  test("detalle: todos los campos, ubicación y autoría", async ({ page }) => {
    await page.goto(`/dealers/${DEALER_LIMA.id}`);
    await expect(heading(page)).toHaveText("Detalle del dealer");
    await expect(page).toHaveTitle("Detalle del dealer · BackOffice Consentimientos");
    await expect(detailValue(page, "Código del dealer")).toHaveText("CL0001");
    await expect(detailValue(page, "Razón social")).toHaveText("ABC Motors S.A.C.");
    await expect(detailValue(page, "RUC")).toHaveText("20100047218");
    await expect(detailValue(page, "Ubicación")).toHaveText("LIMA, LIMA, LIMA (150101)");
    await expect(detailValue(page, "Teléfono de contacto")).toHaveText("014567890");
    await expect(detailValue(page, "Creado por")).toHaveText("Administrador General (admin)");
    await expect(detailValue(page, "Creado el")).toHaveText("15/11/2026 10:35");
    await expect(page.getByRole("link", { name: "Editar CL0001" })).toHaveAttribute("href", `/dealers/${DEALER_LIMA.id}/editar`);
  });

  test("eliminación desde el detalle con confirmación → lista", async ({ page, api }) => {
    await page.goto(`/dealers/${DEALER_LIMA.id}`);
    await page.getByRole("button", { name: "Eliminar CL0001" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Eliminar el dealer CL0001?" });
    await expect(dialog).toHaveAccessibleDescription(
      "Dejará de mostrarse en el BackOffice. Esta acción no se puede deshacer desde aquí.",
    );
    await dialog.getByRole("button", { name: "Eliminar" }).click();
    await expect(page).toHaveURL(/\/dealers$/);
    await expect(toast(page, "Dealer eliminado.")).toBeVisible();
    expect(api.calls("dealerDelete").map((call) => call.path)).toEqual([`/dealers/${DEALER_LIMA.id}`]);
  });

  test("eliminación desde la lista: Cancelar no llama; confirmar avisa y recarga", async ({ page, api }) => {
    api.respond("dealers", ok(pageOf(DEALERS)), ok(pageOf([DEALER_LIMA])));
    await page.goto("/dealers");
    await page.getByRole("button", { name: "Eliminar CA0001" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    expect(api.calls("dealerDelete")).toHaveLength(0);

    await page.getByRole("button", { name: "Eliminar CA0001" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(toast(page, "Dealer eliminado.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "CA0001", exact: true })).toHaveCount(0);
  });

  test("inexistente → el detail de la API", async ({ page }) => {
    await page.goto("/dealers/99999999-9999-4999-8999-999999999999");
    await expect(page.getByText("No existe el dealer.")).toBeVisible();
  });
});

test.describe("Lista: búsqueda, filtros, orden y página en la URL (B8.4)", () => {
  test("columnas, debounce, ubigeo, orden y página; Atrás restaura", async ({ page, api }) => {
    api.respond("dealers", ok(pageOf(DEALERS, 45)));
    await page.goto("/dealers");
    await expect(heading(page)).toHaveText("Dealers");
    await expect(page.getByRole("columnheader")).toHaveText([
      "Código",
      "Razón social",
      "RUC",
      "Distrito",
      "Correo de contacto",
      "Teléfono",
      "Actualizado",
      "Acciones",
    ]);
    const callao = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "CA0001", exact: true }) });
    await expect(callao.getByRole("cell")).toHaveText([
      "CA0001",
      "—",
      "20131312955",
      "CALLAO",
      "ventas@puerto.pe",
      "—",
      "16/11/2026 09:00",
      "Ver CA0001Editar CA0001Eliminar CA0001",
    ]);

    await page.getByLabel(SEARCH_LABEL).pressSequentially("abc motors");
    await expect(page).toHaveURL(/\?q=abc\+motors$/);
    expect(api.calls("dealers").map((call) => call.query.q).filter(Boolean)).toEqual(["abc motors"]);

    await field(page, "Departamento").selectOption({ label: "LIMA" });
    await expect(page).toHaveURL(/departmentCode=15/);
    await field(page, "Provincia").selectOption({ label: "LIMA" });
    await expect(page).toHaveURL(/provinceCode=1501/);
    await field(page, "Distrito").selectOption({ label: "LIMA" });
    await expect(page).toHaveURL(/districtUbigeo=150101/);

    const rucHeader = page.getByRole("columnheader", { name: "RUC" });
    await rucHeader.getByRole("button").click();
    await expect(rucHeader).toHaveAttribute("aria-sort", "ascending");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/page=2/);

    // La URL cambia antes de que salga la petición: esperar a que llegue (antes, una carrera en mobile).
    await expect.poll(() => api.calls("dealers").at(-1)?.query).toEqual({
      q: "abc motors",
      departmentCode: "15",
      provinceCode: "1501",
      districtUbigeo: "150101",
      page: "2",
      pageSize: "20",
      sortBy: "ruc",
      sortOrder: "asc",
    });

    // Cambiar el departamento limpia provincia y distrito también en la URL.
    await field(page, "Departamento").selectOption({ label: "CALLAO" });
    await expect(page).toHaveURL(/departmentCode=07/);
    await expect(page).not.toHaveURL(/provinceCode|districtUbigeo|page=/);

    await page.goBack();
    await expect(field(page, "Distrito")).toHaveValue("150101");
    await expect(page).toHaveURL(/page=2/);
    await page.goBack();
    await page.goBack();
    await expect(rucHeader).not.toHaveAttribute("aria-sort");
    await page.goBack();
    await expect(field(page, "Distrito")).toHaveValue("");
    await page.goBack();
    await page.goBack();
    await expect(field(page, "Departamento")).toHaveValue("");
    await page.goBack();
    await expect(page.getByLabel(SEARCH_LABEL)).toHaveValue("");
  });

  test("sin resultados; error de red con Reintentar", async ({ page, api }) => {
    api.respond("dealers", "network-error", ok(pageOf([])));
    await page.goto("/dealers");
    await expect(page.getByText(NETWORK_ERROR_TEXT)).toBeVisible();
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("No hay resultados para los filtros aplicados.")).toBeVisible();
  });
});

test.describe("Exportar a Excel (B8.5)", () => {
  test("descarga con el nombre de Content-Disposition y los filtros y el orden activos", async ({ page, api }) => {
    api.respond("dealerExport", {
      status: 200,
      raw: EXPORT_CONTENT,
      delayMs: 500,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${EXPORT_FILENAME}"`,
      },
    });
    await page.goto("/dealers?q=CL&departmentCode=15&sortBy=ruc&sortOrder=desc&page=2&pageSize=50");
    const button = page.getByRole("button", { name: "Exportar a Excel" });
    await expect(button).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await button.click();
    const exporting = page.getByRole("button", { name: "Exportando..." });
    await expect(exporting).toBeDisabled();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(EXPORT_FILENAME);
    expect(await readFile(await download.path(), "utf8")).toBe(EXPORT_CONTENT);
    await expect(page.getByRole("button", { name: "Exportar a Excel" })).toBeEnabled();
    // Mismos filtros y orden que la lista, sin paginación (sección 6.6).
    expect(api.calls("dealerExport")[0]?.query).toEqual({ q: "CL", departmentCode: "15", sortBy: "ruc", sortOrder: "desc" });
  });

  test("un error de la exportación se avisa", async ({ page, api }) => {
    api.respond("dealerExport", "network-error");
    await page.goto("/dealers");
    await page.getByRole("button", { name: "Exportar a Excel" }).click();
    await expect(page.getByRole("status").getByText(NETWORK_ERROR_TEXT)).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar a Excel" })).toBeEnabled();
  });
});

test("Operador: acceso completo a Dealers (sección 3.2)", async ({ page, api }) => {
  api.user = OPERATOR;
  await page.goto("/dealers");
  await expect(heading(page)).toHaveText("Dealers");
  await page.getByRole("link", { name: "Nuevo dealer" }).click();
  await expect(heading(page)).toHaveText("Nuevo dealer");
  await page.goto(`/dealers/${DEALER_LIMA.id}/editar`);
  await expect(field(page, "Código del dealer")).toHaveValue("CL0001");
});
