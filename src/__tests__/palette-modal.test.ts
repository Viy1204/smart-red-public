import "./dom-setup";
import { describe, expect, test } from "bun:test";
import { PaletteModal } from "../palette-modal";

describe("PaletteModal", () => {
  test("groups palettes by the current template tone", () => {
    const modal = new PaletteModal({} as any, "#f6f7f9", "清爽编辑版", "template", () => {});
    modal.open();

    const text = modal.contentEl.textContent ?? "";
    expect(text).toContain("适合浅色模板");
    expect(text).toContain("默认配色");
    expect(modal.contentEl.querySelectorAll(".smart-red-palette-card").length).toBeGreaterThan(10);
  });

  test("dark templates recommend dark palettes", () => {
    const modal = new PaletteModal({} as any, "#0d1117", "深夜杂志", "template", () => {});
    modal.open();

    const text = modal.contentEl.textContent ?? "";
    expect(text).toContain("适合深色模板");
    expect(text).toContain("东京夜");
  });
});
