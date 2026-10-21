import type { SmartRedSettings } from './settings';
import type { TemplateThemeOverrides } from './templates/types';
import { THEME_COLOR_KEYS } from './palettes';

export const FRESH_TEMPLATE_ID = 'fresh-editorial';

// These templates carry a complete palette and type pairing. The global
// custom theme is ignored for them so the design stays recognizable; font
// size, chrome size and paragraph spacing still follow the shared controls.
const OWN_PALETTE_TEMPLATES = new Set(['fresh-editorial', 'data-brief', 'letter', 'dossier']);

export function usesOwnPalette(templateId: string | undefined): boolean {
  return !!templateId && OWN_PALETTE_TEMPLATES.has(templateId);
}

export const FRESH_DESIGN = {
  paper: '#F6F7F9',
  coverPaper: '#DDE8EA',
  body: '#23262B',
  accent: '#315C67',
  strong: '#284D57',
  highlight: '#D9E8E7',
  muted: '#536268',
  rule: '#BCCBCF',
  displayFont: '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "SimSun", serif',
  bodyFont: '"Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  padding: 76,
  lineHeight: 1.7,
  headingLineHeight: 1.28,
  minFontSize: 28,
  maxFontSize: 52,
};

export interface FreshReadingSettings {
  fontSize: number;
  chromeFontSize: number;
  spacing: number;
  bodyFontFamily: string;
  headingFontFamily: string;
}

export const DEFAULT_FRESH_READING: FreshReadingSettings = {
  fontSize: 40,
  chromeFontSize: 28,
  spacing: 28,
  bodyFontFamily: '',
  headingFontFamily: '',
};

export const READING_PRESETS = {
  comfortable: { label: '舒适 · 40px', fontSize: 40, spacing: 28 },
  compact: { label: '紧凑 · 36px', fontSize: 36, spacing: 24 },
} as const;

// Normalize persisted input once so controls, pagination and export agree.
export function normalizeFreshReading(raw?: Partial<FreshReadingSettings>): FreshReadingSettings {
  const number = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value)))
      : fallback;
  return {
    fontSize: number(raw?.fontSize, 40, FRESH_DESIGN.minFontSize, FRESH_DESIGN.maxFontSize),
    chromeFontSize: number(raw?.chromeFontSize, 28, 14, 32),
    spacing: number(raw?.spacing, 28, 12, 40),
    bodyFontFamily: typeof raw?.bodyFontFamily === 'string' ? raw.bodyFontFamily.trim() : '',
    headingFontFamily: typeof raw?.headingFontFamily === 'string' ? raw.headingFontFamily.trim() : '',
  };
}

export function readingPresetId(reading: FreshReadingSettings): string {
  return Object.entries(READING_PRESETS).find(([, preset]) =>
    reading.fontSize === preset.fontSize && reading.spacing === preset.spacing
  )?.[0] ?? 'custom';
}

function paletteColors(theme: Partial<TemplateThemeOverrides>): Partial<TemplateThemeOverrides> {
  const colors: Partial<TemplateThemeOverrides> = {};
  for (const key of THEME_COLOR_KEYS) {
    const value = theme[key];
    if (value) (colors as unknown as Record<string, string>)[key] = value;
  }
  return colors;
}

export function getActiveTypography(settings: SmartRedSettings): {
  fontSize: number;
  chromeFontSize: number;
  theme: Partial<TemplateThemeOverrides>;
} {
  const paletteChosen = !!settings.paletteId && settings.paletteId !== 'template';
  if (settings.template === FRESH_TEMPLATE_ID) {
    const reading = settings.freshReading ?? DEFAULT_FRESH_READING;
    return {
      fontSize: reading.fontSize,
      chromeFontSize: reading.chromeFontSize,
      theme: {
        spacing: reading.spacing,
        bodyFontFamily: reading.bodyFontFamily,
        headingFontFamily: reading.headingFontFamily,
        ...(paletteChosen ? paletteColors(settings.theme) : {}),
      },
    };
  }
  if (usesOwnPalette(settings.template)) {
    return {
      fontSize: settings.fontSize,
      chromeFontSize: settings.chromeFontSize,
      theme: {
        spacing: settings.theme.spacing,
        ...(paletteChosen ? paletteColors(settings.theme) : {}),
      },
    };
  }
  return { fontSize: settings.fontSize, chromeFontSize: settings.chromeFontSize, theme: settings.theme };
}

export function freshHeadingSizes(fontSize: number): number[] {
  const round = (size: number) => Math.round(size / 2) * 2;
  const sizes = [
    round(fontSize * 1.55),
    round(fontSize * 1.3),
    round(fontSize * 1.15),
    round(fontSize * 1.05),
  ];
  for (let index = 1; index < sizes.length; index += 1) {
    sizes[index] = Math.min(sizes[index], sizes[index - 1] - 4);
  }
  return sizes;
}
