import { readFileSync } from "node:fs";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";
import { expect, it } from "vitest";

// Decisión D3 (sesión 4): src/lib/api-schema.d.ts se versiona. Este test lo regenera en memoria igual que
// `npm run api:types` (CLI de openapi-typescript) y falla si quedó desactualizado respecto de docs/openapi.json.
it("src/lib/api-schema.d.ts está al día con docs/openapi.json", async () => {
  const ast = await openapiTS(new URL("../docs/openapi.json", import.meta.url), { silent: true });
  const expected = `${COMMENT_HEADER}${astToString(ast)}`;
  const current = readFileSync(new URL("../src/lib/api-schema.d.ts", import.meta.url), "utf8");

  // core.autocrlf=true en Windows puede dejar el archivo con CRLF.
  const normalize = (text: string) => text.replace(/\r\n/g, "\n");
  expect(normalize(current), "Ejecuta `npm run api:types`").toBe(normalize(expected));
}, 30_000);
