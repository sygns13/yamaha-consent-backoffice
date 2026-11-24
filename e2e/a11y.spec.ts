import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ACTIVE_USER, DEALER_LIMA, LOCKED_USER } from "./fixtures";
import { expectNoHorizontalScroll, field, fillLogin, heading, openMainMenu } from "./helpers";
import { ADMIN, apiError, expect, NEW_ADMIN, OPERATOR, test, type MockApi } from "./mock-api";

/**
 * B6.9, B7.6 y B8.6: WCAG 2.2 AA (axe) a 360, 768 y 1280 px, sin scroll horizontal. Rediseño (9.3, U1.4): cada
 * escenario corre en tema claro y oscuro (`prefers-color-scheme`).
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const WIDTHS = [360, 768, 1280];
const THEMES = ["light", "dark"] as const;

interface Scenario {
  name: string;
  /** Prepara la API simulada, navega y deja la pantalla en el estado a revisar. */
  open: (page: Page, api: MockApi) => Promise<void>;
}

const SCENARIOS: Scenario[] = [
  {
    name: "Login",
    open: async (page) => {
      await page.goto("/login?motivo=sesion-expirada");
      await expect(heading(page)).toHaveText("Iniciar sesión");
    },
  },
  {
    name: "Login con error y campos inválidos",
    open: async (page, api) => {
      api.respond("login", apiError(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos."));
      await page.goto("/login");
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page.getByLabel("Usuario", { exact: true })).toHaveAttribute("aria-invalid", "true");
      await fillLogin(page, "admin", "Incorrecta#1");
      await expect(page.getByRole("alert")).toHaveText("Usuario o contraseña incorrectos.");
    },
  },
  {
    name: "Recuperar contraseña",
    open: async (page) => {
      await page.goto("/recuperar-contrasena");
      await expect(heading(page)).toHaveText("Recuperar contraseña");
    },
  },
  {
    name: "Recuperar contraseña enviado",
    open: async (page) => {
      await page.goto("/recuperar-contrasena");
      await page.getByLabel("Usuario o correo").fill("admin");
      await page.getByRole("button", { name: "Enviar enlace" }).click();
      await expect(page.getByLabel("Usuario o correo")).toBeHidden();
    },
  },
  {
    name: "Restablecer contraseña",
    open: async (page) => {
      await page.goto("/restablecer-contrasena?t=abc");
      await page.getByLabel("Nueva contraseña").fill("clave");
      await expect(page.getByRole("listitem").first()).toBeVisible();
    },
  },
  {
    name: "Restablecer con enlace no válido",
    open: async (page) => {
      await page.goto("/restablecer-contrasena");
      await expect(page.getByRole("link", { name: "Solicitar un nuevo enlace" })).toBeVisible();
    },
  },
  {
    name: "Cambiar contraseña obligatorio con errores",
    open: async (page, api) => {
      api.user = NEW_ADMIN;
      await page.goto("/cambiar-contrasena");
      await page.getByLabel("Nueva contraseña").fill("admin");
      await page.getByRole("button", { name: "Cambiar contraseña" }).click();
      await expect(page.getByLabel("Contraseña actual")).toHaveAttribute("aria-invalid", "true");
    },
  },
  {
    name: "Cambiar contraseña voluntario",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/cambiar-contrasena");
      await expect(heading(page)).toHaveText("Cambiar contraseña");
      await expect(page.getByLabel("Contraseña actual")).toBeVisible();
    },
  },
  {
    name: "Inicio (Administrador) con menús abiertos",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/");
      await expect(heading(page)).toHaveText("Hola, Administrador");
      await openMainMenu(page);
      await page.getByRole("button", { name: /Administrador General/ }).click();
      await expect(page.getByRole("link", { name: "Mi perfil" })).toBeVisible();
    },
  },
  {
    name: "Inicio (Operador)",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto("/");
      await expect(heading(page)).toHaveText("Hola, Olga");
    },
  },
  {
    name: "403",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto("/usuarios");
      await expect(heading(page)).toHaveText("No tienes permiso para ver esta página.");
    },
  },
  {
    name: "404",
    open: async (page) => {
      await page.goto("/no-existe");
      await expect(heading(page)).toHaveText("La página que buscas no existe.");
    },
  },
  // --- B7.6 ---
  {
    name: "Usuarios (lista)",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/usuarios");
      await expect(page.getByRole("button", { name: "Desbloquear cruiz" })).toBeVisible();
    },
  },
  {
    name: "Nuevo usuario con errores",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/usuarios/nuevo");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(field(page, "DNI")).toHaveAttribute("aria-invalid", "true");
    },
  },
  {
    name: "Editar usuario con conflicto de versión",
    open: async (page, api) => {
      api.user = ADMIN;
      api.respond("userUpdate", apiError(409, "VERSION_CONFLICT", "El registro fue modificado por otro usuario."));
      await page.goto(`/usuarios/${ACTIVE_USER.id}/editar`);
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByRole("button", { name: "Recargar" })).toBeVisible();
    },
  },
  {
    name: "Detalle de usuario",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto(`/usuarios/${LOCKED_USER.id}`);
      await expect(page.getByRole("button", { name: "Desbloquear cruiz" })).toBeVisible();
    },
  },
  {
    name: "Confirmación (desactivar usuario)",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/usuarios");
      await page.getByRole("button", { name: "Desactivar jperez" }).click();
      await expect(page.getByRole("dialog", { name: "Desactivar" })).toBeVisible();
    },
  },
  {
    name: "Contraseña temporal",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/usuarios");
      await page.getByRole("button", { name: "Generar contraseña temporal jperez" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Generar contraseña temporal" }).click();
      await expect(page.getByRole("dialog", { name: "Contraseña temporal" })).toBeVisible();
    },
  },
  {
    name: "Mi perfil",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/perfil");
      await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
    },
  },
  {
    name: "Mi perfil editando el correo, con errores",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/perfil");
      await page.getByRole("button", { name: "Editar" }).click();
      await field(page, "Correo").fill("nuevo@backoffice.local");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByLabel("Contraseña actual")).toHaveAttribute("aria-invalid", "true");
    },
  },
  {
    name: "Bitácora con el detalle abierto",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.clock.setFixedTime(new Date("2026-11-17T12:00:00-05:00"));
      await page.goto("/auditoria");
      await page.getByRole("button", { name: "Ver detalle" }).first().click();
      await expect(page.getByRole("button", { name: "Ocultar detalle" })).toBeVisible();
    },
  },
  // --- B8.6 ---
  {
    name: "Dealers (lista con filtros)",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto("/dealers?departmentCode=15");
      await expect(page.getByRole("button", { name: "Eliminar CL0001" })).toBeVisible();
      await expect(field(page, "Provincia")).toBeEnabled();
    },
  },
  {
    name: "Nuevo dealer con errores",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto("/dealers/nuevo");
      await field(page, "RUC").fill("20100047219");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(field(page, "RUC")).toHaveAttribute("aria-invalid", "true");
      await expect(field(page, "Distrito")).toHaveAttribute("aria-invalid", "true");
    },
  },
  {
    name: "Editar dealer (ubigeo precargado)",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto(`/dealers/${DEALER_LIMA.id}/editar`);
      await expect(field(page, "Distrito")).toHaveValue("150101");
    },
  },
  {
    name: "Detalle de dealer",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto(`/dealers/${DEALER_LIMA.id}`);
      await expect(page.getByRole("button", { name: "Eliminar CL0001" })).toBeVisible();
    },
  },
  {
    name: "Confirmación (eliminar dealer)",
    open: async (page, api) => {
      api.user = OPERATOR;
      await page.goto("/dealers");
      await page.getByRole("button", { name: "Eliminar CL0001" }).click();
      await expect(page.getByRole("dialog", { name: "¿Eliminar el dealer CL0001?" })).toBeVisible();
    },
  },
];

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`${width} px, tema ${theme === "light" ? "claro" : "oscuro"}`, () => {
      for (const scenario of SCENARIOS) {
        test(scenario.name, async ({ page, api }) => {
          await page.emulateMedia({ colorScheme: theme });
          await page.setViewportSize({ width, height: 800 });
          await scenario.open(page, api);

          const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
          expect(results.violations.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map((n) => n.target) }))).toEqual(
            [],
          );
          await expectNoHorizontalScroll(page);
        });
      }
    });
  }
}
