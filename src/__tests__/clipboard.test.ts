import "./dom-setup";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { copyPngBlobToClipboard } from "../clipboard";

describe("copyPngBlobToClipboard", () => {
  const originalNavigator = globalThis.navigator;
  const originalClipboardItem = (globalThis as any).ClipboardItem;

  beforeEach(() => {
    (globalThis as any).ClipboardItem = class {
      data: Record<string, Blob>;
      constructor(data: Record<string, Blob>) {
        this.data = data;
      }
    };
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    (globalThis as any).ClipboardItem = originalClipboardItem;
  });

  test("writes PNG blob to clipboard", async () => {
    let written: any[] | null = null;
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          write: async (items: any[]) => {
            written = items;
          },
        },
      },
      configurable: true,
    });

    const blob = new Blob(["png"], { type: "image/png" });
    await copyPngBlobToClipboard(blob);

    expect(written).not.toBeNull();
    expect(written![0].data["image/png"]).toBe(blob);
  });

  test("throws when clipboard image writing is unavailable", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });

    const blob = new Blob(["png"], { type: "image/png" });
    await expect(copyPngBlobToClipboard(blob)).rejects.toThrow(
      "Clipboard image writing is not available"
    );
  });
});
