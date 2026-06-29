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
