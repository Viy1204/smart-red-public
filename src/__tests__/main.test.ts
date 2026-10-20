import { describe, expect, it } from "bun:test";
import SmartRedPlugin from "../main";

describe("SmartRedPlugin.loadSettings", () => {
  it("falls back to defaults when loadData returns null", async () => {
    const plugin = new SmartRedPlugin({} as any);
    plugin.loadData = async () => null as any;
    await plugin.loadSettings();
    expect(plugin.settings.template).toBe("editorial");
    expect(plugin.settings.headingLevel).toBe("h2");
    expect(plugin.settings.fontSize).toBe(31);
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
