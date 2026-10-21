import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PALETTE,
  THEME_PRESETS,
  applyThemePreset,
  getPalette,
  templateTone,
} from "../palettes";

describe("palettes", () => {
  test("default palette clears every color but keeps font and spacing", () => {
    const settings = {
      paletteId: 'tokyo-night',
      theme: {
        fontFamily: 'PingFang SC',
        spacing: 30,
        textColor: '#ffffff',
        backgroundColor: '#000000',
        accentColor: '#ff0000',
        boldColor: '#ff0000',
        highlightColor: '#333333',
        h1Color: '#ffffff',
        h2Color: '#ffffff',
        h3Color: '#ffffff',
      },
    };

    applyThemePreset(settings, DEFAULT_PALETTE);

    expect(settings.paletteId).toBe('template');
    expect(settings.theme.textColor).toBe('');
    expect(settings.theme.backgroundColor).toBe('');
    expect(settings.theme.highlightColor).toBe('');
    expect(settings.theme.fontFamily).toBe('PingFang SC');
    expect(settings.theme.spacing).toBe(30);
  });

  test("a chosen palette replaces stale colors", () => {
    const settings = {
      paletteId: 'template',
      theme: {
        fontFamily: '',
        spacing: 28,
        textColor: '#111111',
        backgroundColor: '#ffffff',
        accentColor: '#111111',
        boldColor: '#111111',
        highlightColor: '#eeeeee',
        h1Color: '#111111',
        h2Color: '#111111',
        h3Color: '#111111',
      },
    };
    const preset = getPalette('tokyo-night');
    expect(preset).toBeDefined();

    applyThemePreset(settings, preset!);

    expect(settings.paletteId).toBe('tokyo-night');
    expect(settings.theme.backgroundColor).toBe('#1a1b26');
    expect(settings.theme.accentColor).toBe('#7aa2f7');
  });

  test("template tone follows background luminance", () => {
    expect(templateTone('#f6f7f9')).toBe('light');
    expect(templateTone('#0d1117')).toBe('dark');
    expect(templateTone('#2e3440')).toBe('dark');
  });

  test("every palette is discoverable by id", () => {
    for (const preset of THEME_PRESETS) {
      expect(getPalette(preset.id)).toBe(preset);
    }
  });
});
