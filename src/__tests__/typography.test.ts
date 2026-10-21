import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FRESH_READING,
  freshHeadingSizes,
  getActiveTypography,
  READING_PRESETS,
} from "../typography";

const baseSettings = {
  fontSize: 31,
  chromeFontSize: 22,
  template: "letter",
  theme: { textColor: "#ffffff", backgroundColor: "#000000", spacing: 30 },
  freshReading: DEFAULT_FRESH_READING,
} as any;

describe("getActiveTypography", () => {
  test("design templates keep their own palette but follow spacing", () => {
    for (const template of ["data-brief", "letter", "dossier"]) {
      const active = getActiveTypography({ ...baseSettings, template });
      expect(active.theme.textColor).toBeUndefined();
      expect(active.theme.backgroundColor).toBeUndefined();
      expect(active.theme.spacing).toBe(30);
      expect(active.fontSize).toBe(31);
    }
  });

  test("brand templates still take the global theme", () => {
    const active = getActiveTypography({ ...baseSettings, template: "claude" });
    expect(active.theme.textColor).toBe("#ffffff");
    expect(active.theme.backgroundColor).toBe("#000000");
  });

  test("a chosen palette applies to design templates too", () => {
    const active = getActiveTypography({
      ...baseSettings,
      template: "data-brief",
      paletteId: "tokyo-night",
    });
    expect(active.theme.textColor).toBe("#ffffff");
    expect(active.theme.backgroundColor).toBe("#000000");
    expect(active.theme.spacing).toBe(30);
  });
});

describe("freshHeadingSizes", () => {
  test("keeps every heading level distinct and ordered", () => {
    for (const fontSize of [28, 36, 40, 48, 52]) {
      const sizes = freshHeadingSizes(fontSize);
      for (let index = 1; index < sizes.length; index += 1) {
        expect(sizes[index]).toBeLessThan(sizes[index - 1]);
      }
      expect(sizes[0]).toBeGreaterThan(fontSize);
    }
  });
});

describe("reading presets", () => {
  test("default reading size matches the comfortable preset", () => {
    expect(DEFAULT_FRESH_READING.fontSize).toBe(READING_PRESETS.comfortable.fontSize);
    expect(DEFAULT_FRESH_READING.spacing).toBe(READING_PRESETS.comfortable.spacing);
  });

  test("compact preset keeps a readable body size", () => {
    expect(READING_PRESETS.compact.fontSize).toBeGreaterThanOrEqual(34);
    expect(READING_PRESETS.compact.fontSize).toBeLessThan(READING_PRESETS.comfortable.fontSize);
  });
});
