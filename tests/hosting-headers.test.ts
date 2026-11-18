import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "../vite.config.ts";

// Sección 8.8 (B9): firebase.json (Producción) sirve las mismas cabeceras que `vite preview` (con las que corren los
// e2e) más Strict-Transport-Security; reescribe /api/v1/backoffice/** a Cloud Run (mismo origen, sección 2.3) y el
// resto a index.html (SPA). La región del rewrite es PENDIENTE-09: no se valida su valor.
type Header = { key: string; value: string };
type HeaderRule = { source?: string; regex?: string; headers: Header[] };
type Rewrite = { source: string; destination?: string; run?: { serviceId: string; region: string } };
type FirebaseConfig = {
  hosting: { target: string; public: string; rewrites: Rewrite[]; headers: HeaderRule[] };
};

const { hosting } = JSON.parse(
  readFileSync(new URL("../firebase.json", import.meta.url), "utf8"),
) as FirebaseConfig;

function headersOf(rule: HeaderRule | undefined): Record<string, string> {
  return Object.fromEntries((rule?.headers ?? []).map((header) => [header.key, header.value]));
}

describe("firebase.json (sección 8.8)", () => {
  it("sitio del BackOffice con el build de Vite", () => {
    expect(hosting.target).toBe("backoffice");
    expect(hosting.public).toBe("dist");
  });

  it("la API va a Cloud Run en el mismo origen y el resto a index.html", () => {
    const [api, spa, ...rest] = hosting.rewrites;
    expect(api?.source).toBe("/api/v1/backoffice/**");
    expect(api?.run?.serviceId).toBe("consent-api");
    expect(api?.destination).toBeUndefined();
    expect(spa).toEqual({ source: "**", destination: "/index.html" });
    expect(rest).toEqual([]);
  });

  it("las cabeceras de seguridad son las del preview más HSTS", () => {
    expect(headersOf(hosting.headers.find((rule) => rule.source === "**"))).toEqual({
      ...SECURITY_HEADERS,
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    });
  });

  it("caché: rutas sin punto con no-cache; assets con hash por un año", () => {
    expect(headersOf(hosting.headers.find((rule) => rule.regex === "^/[^.]*$"))).toEqual({
      "Cache-Control": "no-cache",
    });
    expect(headersOf(hosting.headers.find((rule) => rule.source === "/assets/**"))).toEqual({
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });
});
