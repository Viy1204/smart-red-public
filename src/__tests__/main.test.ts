import { describe, expect, it } from "bun:test";
import SmartRedPlugin from "../main";
import { VIEW_TYPE_SMART_RED } from "../view";

describe("SmartRedPlugin lifecycle", () => {
  it("preserves a preview leaf moved into the main workspace when unloading", async () => {
    const viewState = { type: VIEW_TYPE_SMART_RED, state: {}, pinned: true };
    const leaf = { getViewState: () => viewState };
    const leaves = [leaf];
    const layout = {
      main: {
        type: "split",
        direction: "horizontal",
        children: [{ id: "moved-preview", type: "leaf", state: viewState }],
      },
    };
    const workspace = {
      getLeavesOfType: (type: string) => leaves.filter((item) => item.getViewState().type === type),
      getLayout: () => layout,
      detachLeavesOfType(type: string) {
        if (type === VIEW_TYPE_SMART_RED) {
          leaves.length = 0;
          layout.main.children.length = 0;
        }
      },
    };
    const plugin = new SmartRedPlugin({ workspace } as any);
    const beforeUnload = structuredClone({
      layout: workspace.getLayout(),
      leaves: workspace.getLeavesOfType(VIEW_TYPE_SMART_RED).map((item) => item.getViewState()),
    });

    await plugin.onunload();

    const afterUnload = structuredClone({
      layout: workspace.getLayout(),
      leaves: workspace.getLeavesOfType(VIEW_TYPE_SMART_RED).map((item) => item.getViewState()),
    });
    expect(afterUnload).toEqual(beforeUnload);
  });
});

describe("SmartRedPlugin.loadSettings", () => {
  it("falls back to defaults when loadData returns null", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => null as any;
    await plugin.loadSettings();
    expect(plugin.settings.template).toBe("fresh-editorial");
    expect(plugin.settings.headingLevel).toBe("h2");
    expect(plugin.settings.fontSize).toBe(31);
  });

  it("marks legacy custom colors on brand templates as a custom palette", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => ({
      template: "claude",
      theme: { textColor: "#ffffff", backgroundColor: "#000000" },
    } as any);
    await plugin.loadSettings();

    expect(plugin.settings.paletteId).toBe("custom");
  });

  it("keeps design templates on their own palette despite legacy colors", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => ({
      template: "data-brief",
      theme: { textColor: "#ffffff", backgroundColor: "#000000" },
    } as any);
    await plugin.loadSettings();

    expect(plugin.settings.paletteId).toBe("template");
  });

  it("preserves saved bold colors and defaults highlight color for older settings", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => ({ theme: { boldColor: "#a12244" } } as any);
    await plugin.loadSettings();

    expect(plugin.settings.theme.boldColor).toBe("#a12244");
    expect(plugin.settings.theme.highlightColor).toBe("");
  });

  it("restores a saved highlight color", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => ({ theme: { highlightColor: "#ffdd66" } } as any);
    await plugin.loadSettings();

    expect(plugin.settings.theme.highlightColor).toBe("#ffdd66");
  });

  it("merges saved partial settings", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => ({
      template: "claude",
      fontSize: 36,
      headingLevel: "h1",
    } as any);
    await plugin.loadSettings();
    expect(plugin.settings.template).toBe("claude");
    expect(plugin.settings.headingLevel).toBe("h1");
    expect(plugin.settings.fontSize).toBe(36);
  });
});
