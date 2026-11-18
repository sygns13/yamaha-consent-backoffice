import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveFile } from "./download";

const BLOB_URL = "blob:http://localhost/123";
const createObjectURL = vi.fn<(blob: Blob) => string>(() => BLOB_URL);
const revokeObjectURL = vi.fn<(url: string) => void>();

beforeEach(() => {
  vi.useFakeTimers();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  // jsdom no implementa createObjectURL/revokeObjectURL.
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("saveFile (sección 8.2: solo el enlace temporal, sin llamar a la API)", () => {
  it("arma un enlace con download, lo activa, lo quita y libera la URL después", () => {
    const clicks: { href: string; download: string; hidden: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push({ href: this.href, download: this.download, hidden: this.hasAttribute("hidden") });
    });
    const blob = new Blob(["xlsx"]);

    saveFile(blob, "dealers_20261117_1030.xlsx");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicks).toEqual([{ href: BLOB_URL, download: "dealers_20261117_1030.xlsx", hidden: true }]);
    expect(document.querySelector("a")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
  });
});
