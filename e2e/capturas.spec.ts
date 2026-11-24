import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { ACTIVE_USER, DEALER_LIMA, DEALERS, LOCKED_USER, page as pageOf } from "./fixtures";
import { fillLogin, heading } from "./helpers";
import { ADMIN, apiError, expect, NEW_ADMIN, ok, OPERATOR, test, type MockApi } from "./mock-api";

/**
 * Galería de capturas para revisión humana (spec de rediseño, 9.5). No es una aserción visual: genera
 * `capturas/actual/<pantalla>-<ancho>-<tema>.png` con la API simulada y el reloj fijo. Corre solo con
 * `npm run capturas` (playwright.capturas.config.ts); la configuración base lo excluye.
 */
const WIDTHS = [360, 768, 1280];
// U0 generó solo claro (la UI anterior no tenía tema oscuro); desde U1, ambos.
const THEMES = ["light", "dark"] as const;
const NOW = new Date("2026-11-17T12:00:00-05:00");

interface Screen {
  name: string;
  /** Prepara la API simulada, navega y deja la pantalla en el estado a capturar. */
  open: (page: Page, api: MockApi) => Promise<void>;
}

const SCREENS: Screen[] = [
  {
    name: "login",
    open: async (page) => {
      await page.goto("/login");
      await expect(heading(page)).toHaveText("Iniciar sesión");
    },
  },
  {
    name: "login-error",
    open: async (page, api) => {
      api.respond("login", apiError(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos."));
      await page.goto("/login");
      await fillLogin(page, "admin", "Incorrecta#1");
      await expect(page.getByRole("alert")).toHaveText("Usuario o contraseña incorrectos.");
    },
  },
  {
    name: "recuperar",
    open: async (page) => {
      await page.goto("/recuperar-contrasena");
      await expect(heading(page)).toHaveText("Recuperar contraseña");
    },
  },
  {
    name: "recuperar-enviado",
    open: async (page) => {
      await page.goto("/recuperar-contrasena");
      await page.getByLabel("Usuario o correo").fill("admin");
      await page.getByRole("button", { name: "Enviar enlace" }).click();
      await expect(page.getByLabel("Usuario o correo")).toBeHidden();
    },
  },
  {
    name: "restablecer",
    open: async (page) => {
      await page.goto("/restablecer-contrasena?t=abc");
      await page.getByLabel("Nueva contraseña").fill("Clave");
      await expect(page.getByRole("listitem").first()).toBeVisible();
    },
  },
  {
    name: "cambiar-contrasena-obligatorio",
    open: async (page, api) => {
      api.user = NEW_ADMIN;
      await page.goto("/cambiar-contrasena");
      await expect(heading(page)).toHaveText("Cambiar contraseña");
    },
  },
  {
    name: "inicio",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/");
      await expect(heading(page)).toHaveText("Hola, Administrador");
    },
  },
  {
    name: "dealers",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/dealers");
      await expect(page.getByText("contacto@abcmotors.pe")).toBeVisible();
    },
  },
  {
    name: "dealers-vacia",
    open: async (page, api) => {
      api.user = ADMIN;
      api.respond("dealers", ok(pageOf([])));
      await page.goto("/dealers?q=zzz");
      await expect(page.getByText("No hay resultados para los filtros aplicados.")).toBeVisible();
    },
  },
  {
    name: "dealers-cargando",
    open: async (page, api) => {
      api.user = ADMIN;
      api.respond("dealers", { status: 200, body: pageOf(DEALERS), delayMs: 5_000 });
      await page.goto("/dealers");
      await expect(heading(page)).toHaveText("Dealers");
      await expect(page.getByText("Cargando...")).toBeAttached();
    },
  },
  {
    name: "dealer-formulario-errores",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/dealers/nuevo");
      await page.getByRole("textbox", { name: "RUC", exact: true }).fill("20100047219");
      await page.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByRole("textbox", { name: "RUC", exact: true })).toHaveAttribute("aria-invalid", "true");
    },
  },
  {
    name: "dealer-detalle",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto(`/dealers/${DEALER_LIMA.id}`);
      await expect(page.getByRole("button", { name: "Eliminar CL0001" })).toBeVisible();
    },
  },
  {
    name: "usuarios-mas-acciones",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/usuarios");
      await expect(page.getByText("jperez@dominio.com")).toBeVisible();
      // "Más acciones" llega en U3 (D4); antes, la lista se captura tal cual.
      const more = page.getByRole("button", { name: "Más acciones jperez" });
      if ((await more.count()) > 0) await more.click();
    },
  },
  {
    name: "usuario-detalle",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto(`/usuarios/${LOCKED_USER.id}`);
      await expect(page.getByRole("button", { name: "Desbloquear cruiz" })).toBeVisible();
    },
  },
  {
    name: "contrasena-temporal",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto(`/usuarios/${ACTIVE_USER.id}`);
      await page.getByRole("button", { name: "Generar contraseña temporal jperez" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Generar contraseña temporal" }).click();
      await expect(page.getByRole("dialog", { name: "Contraseña temporal" })).toBeVisible();
    },
  },
  {
    name: "confirmacion",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto(`/dealers/${DEALER_LIMA.id}`);
      await page.getByRole("button", { name: "Eliminar CL0001" }).click();
      await expect(page.getByRole("dialog", { name: "¿Eliminar el dealer CL0001?" })).toBeVisible();
    },
  },
  {
    name: "bitacora-detalle",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/auditoria");
      await page.getByRole("button", { name: "Ver detalle" }).first().click();
      await expect(page.getByRole("button", { name: "Ocultar detalle" })).toBeVisible();
    },
  },
  {
    name: "perfil",
    open: async (page, api) => {
      api.user = ADMIN;
      await page.goto("/perfil");
      await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
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

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    for (const screen of SCREENS) {
      test(`${screen.name} ${width} ${theme}`, async ({ page, api }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.setViewportSize({ width, height: 800 });
        await page.clock.setFixedTime(NOW);
        await screen.open(page, api);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const path = fileURLToPath(new URL(`../capturas/actual/${screen.name}-${width}-${theme}.png`, import.meta.url));
        await page.screenshot({ path, fullPage: true, animations: "disabled" });
        // La respuesta con demora ("cargando") termina antes de cerrar la página: nada llega al proxy del preview.
        await page.unrouteAll({ behavior: "wait" });
      });
    }
  }
}
