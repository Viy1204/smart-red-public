import "./dom-setup";
import { describe, expect, test } from "bun:test";
import SmartRedPlugin from "../main";
import { DEFAULT_SETTINGS, SmartRedSettingTab } from "../settings";
import { App } from "./obsidian-mock";

async function fontSizeControl(template: "fresh-editorial" | "editorial") {
  const app = new App();
  const plugin = new SmartRedPlugin(app as any);
  let stored = structuredClone({ ...DEFAULT_SETTINGS, template });
  plugin.settings = structuredClone(stored);
  plugin.loadData = async () => structuredClone(stored);
  plugin.saveData = async (settings) => { stored = structuredClone(settings); };
  const tab = new SmartRedSettingTab(app as any, plugin);
  tab.display();
  const slider = tab.containerEl.querySelector(
    '[aria-label="正文字号"] input[type="range"]'
  ) as HTMLInputElement;
  expect(slider).not.toBeNull();
  return { plugin, slider };
}

describe("body font size settings control", () => {
  test("fresh reading allows 28px and excludes 24–27px", async () => {
    const { plugin, slider } = await fontSizeControl("fresh-editorial");

    expect(slider.min).toBe("28");
    expect(slider.max).toBe("52");
    for (const value of [24, 25, 26, 27]) {
      expect(value).toBeLessThan(Number(slider.min));
    }
    slider.value = "28";
    slider.dispatchEvent(new window.Event("input"));
    await Promise.resolve();
    await plugin.loadSettings();

    expect(slider.value).toBe("28");
    expect(plugin.settings.freshReading.fontSize).toBe(28);
    expect(plugin.settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
  });

  test("legacy templates still allow 24px", async () => {
    const { plugin, slider } = await fontSizeControl("editorial");

    expect(slider.min).toBe("24");
    slider.value = "24";
    slider.dispatchEvent(new window.Event("input"));
    await Promise.resolve();
    await plugin.loadSettings();

    expect(plugin.settings.fontSize).toBe(24);
    expect(plugin.settings.freshReading.fontSize).toBe(DEFAULT_SETTINGS.freshReading.fontSize);
  });
});
