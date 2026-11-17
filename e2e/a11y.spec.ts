import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expectNoHorizontalScroll, fillLogin, heading, openMainMenu } from "./helpers";
import { ADMIN, apiError, expect, NEW_ADMIN, OPERATOR, test, type MockApi } from "./mock-api";

/** B6.9: WCAG 2.2 AA (axe) a 360, 768 y 1280 px, sin scroll horizontal. */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const WIDTHS = [360, 768, 1280];

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
];

for (const width of WIDTHS) {
  test.describe(`${width} px`, () => {
    for (const scenario of SCENARIOS) {
      test(scenario.name, async ({ page, api }) => {
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
