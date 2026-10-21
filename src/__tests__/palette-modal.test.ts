import "./dom-setup";
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { PaletteModal } from "../palette-modal";
import { DEFAULT_PALETTE, THEME_PRESETS, getPalette, type ThemePreset } from "../palettes";

const modals: PaletteModal[] = [];

function openModal(background: string, currentPaletteId = "template", onChoose: (preset: ThemePreset) => void | Promise<void> = () => {}) {
  const modal = new PaletteModal({} as any, background, "清爽编辑版", currentPaletteId, onChoose);
  modals.push(modal);
  modal.open();
  return modal;
}

function button(modal: PaletteModal, label: string): HTMLButtonElement {
  const element = modal.contentEl.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(element).not.toBeNull();
  return element!;
}

afterEach(() => {
  mock.restore();
  for (const modal of modals) modal.close();
  modals.length = 0;
});

describe("PaletteModal", () => {
  test.each([
    ["#f6f7f9", "template", "浅色", "清爽青灰", "东京夜"],
    ["#0d1117", "template", "深色", "东京夜", "清爽青灰"],
    ["#f6f7f9", "custom", "浅色", "清爽青灰", "东京夜"],
    ["#0d1117", "custom", "深色", "东京夜", "清爽青灰"],
    ["#f6f7f9", "tokyo-night", "深色", "东京夜", "清爽青灰"],
    ["#0d1117", "fresh-cool", "浅色", "清爽青灰", "东京夜"],
  ])("opens %s / %s in the matching category", (background, currentId, tone, visible, hidden) => {
    const modal = openModal(background, currentId);

    expect(modal.titleEl.textContent).toBe("配色");
    expect(button(modal, tone).getAttribute("aria-pressed")).toBe("true");
    expect(button(modal, visible)).toBeDefined();
    expect(modal.contentEl.querySelector(`button[aria-label="${hidden}"]`)).toBeNull();
  });

  test("browsing categories only changes the visible palettes", () => {
    const onChoose = mock(() => {});
    const modal = openModal("#f6f7f9", "fresh-cool", onChoose);
    const close = spyOn(modal, "close");

    button(modal, "深色").click();

    expect(button(modal, "深色").getAttribute("aria-pressed")).toBe("true");
    expect(button(modal, "浅色").getAttribute("aria-pressed")).toBe("false");
    expect(button(modal, "东京夜").getAttribute("aria-pressed")).toBe("false");
    expect(Array.from(modal.contentEl.querySelectorAll('button'), (option) => option.getAttribute('aria-label'))).toEqual([
      "默认配色", "浅色", "深色",
      ...THEME_PRESETS.filter((preset) => preset.tone === "dark").map((preset) => preset.label.replace(/\s*\(深\)$/, "")),
    ]);

    button(modal, "浅色").click();

    expect(button(modal, "清爽青灰").getAttribute("aria-pressed")).toBe("true");
    expect(button(modal, "极简白").getAttribute("aria-pressed")).toBe("false");
    expect(Array.from(modal.contentEl.querySelectorAll('button'), (option) => option.getAttribute('aria-label'))).toEqual([
      "默认配色", "浅色", "深色",
      ...THEME_PRESETS.filter((preset) => preset.tone === "light").map((preset) => preset.label.replace(/\s*\(深\)$/, "")),
    ]);
    expect(onChoose).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  test("labels omit redundant tone descriptions and keep swatches decorative", () => {
    const modal = openModal("#0d1117");

    expect(button(modal, "深夜备忘").textContent).toBe("深夜备忘");
    const text = modal.contentEl.textContent ?? "";
    expect(text).not.toContain("(深)");
    expect(text).not.toContain("跟随模板");
    expect(text).not.toContain("深色模板优先");
    expect(button(modal, "深夜备忘").querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(getPalette("ntr-default")?.label).toBe("深夜备忘 (深)");
    expect(button(modal, "默认配色").getAttribute("aria-pressed")).toBe("true");
    expect(button(modal, "东京夜").getAttribute("aria-pressed")).toBe("false");
    for (const option of modal.contentEl.querySelectorAll("button")) {
      expect(option.type).toBe("button");
      expect(option.tabIndex).toBe(0);
    }
  });

  test("choosing a palette waits for its callback, then closes once", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onChoose = mock(() => pending);
    const modal = openModal("#f6f7f9", "fresh-cool", onChoose);
    const close = spyOn(modal, "close");

    expect(button(modal, "默认配色").getAttribute("aria-pressed")).toBe("false");
    expect(button(modal, "清爽青灰").getAttribute("aria-pressed")).toBe("true");
    button(modal, "深色").click();
    button(modal, "深夜备忘").click();

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(getPalette("ntr-default"));
    expect(close).not.toHaveBeenCalled();
    expect(modal.contentEl.children.length).toBeGreaterThan(0);

    finish();
    await pending;

    expect(close).toHaveBeenCalledTimes(1);
    expect(modal.contentEl.children.length).toBe(0);
  });

  test("reset passes the original default palette and closes once", async () => {
    const onChoose = mock<(preset: ThemePreset) => void>(() => {});
    const modal = openModal("#0d1117", "tokyo-night", onChoose);
    const close = spyOn(modal, "close");

    expect(button(modal, "默认配色").getAttribute("aria-pressed")).toBe("false");
    button(modal, "默认配色").click();
    await Promise.resolve();

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose.mock.calls[0][0]).toBe(DEFAULT_PALETTE);
    expect(close).toHaveBeenCalledTimes(1);
    expect(modal.contentEl.children.length).toBe(0);
  });

  test("closing clears the modal content", () => {
    const modal = openModal("#f6f7f9");
    expect(modal.contentEl.children.length).toBeGreaterThan(0);

    modal.close();

    expect(modal.contentEl.children.length).toBe(0);
    expect(modal.contentEl.textContent).toBe("");
  });
});
