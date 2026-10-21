import type { TemplateThemeOverrides } from './templates/types';

export type PaletteTone = 'light' | 'dark';

export interface ThemePreset {
  id: string;
  label: string;
  tone?: PaletteTone;
  theme: Partial<TemplateThemeOverrides>;
}

export const DEFAULT_PALETTE_ID = 'template';

export const THEME_COLOR_KEYS = [
  'textColor',
  'backgroundColor',
  'accentColor',
  'boldColor',
  'highlightColor',
  'h1Color',
  'h2Color',
  'h3Color',
] as const;

export const DEFAULT_PALETTE: ThemePreset = {
  id: DEFAULT_PALETTE_ID,
  label: '默认配色',
  theme: {},
};

// Palettes are grouped by tone so the picker can recommend a matching set:
// dark templates open with the dark palettes first, light templates with light.
// The ntr-* entries are the palettes ported from note-to-red.
export const THEME_PRESETS: ThemePreset[] = [
  DEFAULT_PALETTE,
  {
    id: 'fresh-cool',
    label: '清爽青灰',
    tone: 'light',
    theme: {
      textColor: '#23262b',
      backgroundColor: '#f6f7f9',
      accentColor: '#315c67',
      boldColor: '#284d57',
      highlightColor: '#d9e8e7',
      h1Color: '#23262b',
      h2Color: '#23262b',
      h3Color: '#23262b',
    },
  },
  {
    id: 'warm-paper',
    label: '暖纸棕',
    tone: 'light',
    theme: {
      textColor: '#3c362e',
      backgroundColor: '#fbf7ef',
      accentColor: '#a6532f',
      boldColor: '#8c4326',
      highlightColor: '#f0dfc8',
      h1Color: '#2f2a24',
      h2Color: '#2f2a24',
      h3Color: '#2f2a24',
    },
  },
  {
    id: 'jade-brief',
    label: '松绿简报',
    tone: 'light',
    theme: {
      textColor: '#263a36',
      backgroundColor: '#f2f5f4',
      accentColor: '#2e6b5f',
      boldColor: '#1f5a4f',
      highlightColor: '#cfe4da',
      h1Color: '#17322d',
      h2Color: '#17322d',
      h3Color: '#17322d',
    },
  },
  {
    id: 'claude-cream',
    label: '奶油珊瑚',
    tone: 'light',
    theme: {
      textColor: '#3d3d3a',
      backgroundColor: '#faf9f5',
      accentColor: '#cc785c',
      boldColor: '#b0573f',
      highlightColor: '#f0e4d8',
      h1Color: '#141413',
      h2Color: '#141413',
      h3Color: '#141413',
    },
  },
  {
    id: 'solarized-light',
    label: '日光纸',
    tone: 'light',
    theme: {
      textColor: '#586e75',
      backgroundColor: '#fdf6e3',
      accentColor: '#268bd2',
      boldColor: '#cb4b16',
      highlightColor: '#eee8d5',
      h1Color: '#073642',
      h2Color: '#073642',
      h3Color: '#073642',
    },
  },
  {
    id: 'rose-pine-dawn',
    label: '玫瑰晨光',
    tone: 'light',
    theme: {
      textColor: '#575279',
      backgroundColor: '#faf4ed',
      accentColor: '#d7827e',
      boldColor: '#b4637a',
      highlightColor: '#f2e9e1',
      h1Color: '#575279',
      h2Color: '#575279',
      h3Color: '#575279',
    },
  },
  {
    id: 'catppuccin-latte',
    label: '拿铁',
    tone: 'light',
    theme: {
      textColor: '#4c4f69',
      backgroundColor: '#eff1f5',
      accentColor: '#7287fd',
      boldColor: '#8839ef',
      highlightColor: '#dce0e8',
      h1Color: '#4c4f69',
      h2Color: '#4c4f69',
      h3Color: '#4c4f69',
    },
  },
  {
    id: 'midnight-ink',
    label: '午夜墨',
    tone: 'dark',
    theme: {
      textColor: '#e6edf3',
      backgroundColor: '#0d1117',
      accentColor: '#58a6ff',
      boldColor: '#79c0ff',
      highlightColor: '#1f2a3a',
      h1Color: '#e6edf3',
      h2Color: '#e6edf3',
      h3Color: '#e6edf3',
    },
  },
  {
    id: 'tokyo-night',
    label: '东京夜',
    tone: 'dark',
    theme: {
      textColor: '#c0caf5',
      backgroundColor: '#1a1b26',
      accentColor: '#7aa2f7',
      boldColor: '#bb9af7',
      highlightColor: '#283457',
      h1Color: '#c0caf5',
      h2Color: '#c0caf5',
      h3Color: '#c0caf5',
    },
  },
  {
    id: 'gruvbox-dark',
    label: '复古夜',
    tone: 'dark',
    theme: {
      textColor: '#ebdbb2',
      backgroundColor: '#282828',
      accentColor: '#fabd2f',
      boldColor: '#fb4934',
      highlightColor: '#3c3836',
      h1Color: '#ebdbb2',
      h2Color: '#ebdbb2',
      h3Color: '#ebdbb2',
    },
  },
  {
    id: 'catppuccin-mocha',
    label: '摩卡',
    tone: 'dark',
    theme: {
      textColor: '#cdd6f4',
      backgroundColor: '#1e1e2e',
      accentColor: '#cba6f7',
      boldColor: '#f38ba8',
      highlightColor: '#313244',
      h1Color: '#cdd6f4',
      h2Color: '#cdd6f4',
      h3Color: '#cdd6f4',
    },
  },
  {
    id: 'nord-night',
    label: '北境夜',
    tone: 'dark',
    theme: {
      textColor: '#eceff4',
      backgroundColor: '#2e3440',
      accentColor: '#88c0d0',
      boldColor: '#81a1c1',
      highlightColor: '#3b4252',
      h1Color: '#eceff4',
      h2Color: '#eceff4',
      h3Color: '#eceff4',
    },
  },
  {
    id: 'solarized-dark',
    label: '深日光',
    tone: 'dark',
    theme: {
      textColor: '#93a1a1',
      backgroundColor: '#002b36',
      accentColor: '#2aa198',
      boldColor: '#cb4b16',
      highlightColor: '#073642',
      h1Color: '#93a1a1',
      h2Color: '#93a1a1',
      h3Color: '#93a1a1',
    },
  },
  {
    id: 'ntr-default',
    label: '深夜备忘 (深)',
    tone: 'dark',
    theme: { textColor: '#f2f2f7', backgroundColor: '#1c1c1e', accentColor: '#0a84ff', boldColor: '#0a84ff', highlightColor: '#183656', h1Color: '#f2f2f7', h2Color: '#f2f2f7', h3Color: '#f2f2f7' },
  },
  {
    id: 'ntr-minimal',
    label: '极简白',
    tone: 'light',
    theme: { textColor: '#333333', backgroundColor: '#ffffff', accentColor: '#6c9eb8', boldColor: '#4a4a4a', highlightColor: '#dae7ed', h1Color: '#333333', h2Color: '#333333', h3Color: '#333333' },
  },
  {
    id: 'ntr-elegant',
    label: '优雅紫黑 (深)',
    tone: 'dark',
    theme: { textColor: '#c4b8dd', backgroundColor: '#1a1721', accentColor: '#b490ff', boldColor: '#b490ff', highlightColor: '#413559', h1Color: '#e2d9f3', h2Color: '#e2d9f3', h3Color: '#e2d9f3' },
  },
  {
    id: 'ntr-cyber',
    label: '赛博朋克',
    tone: 'light',
    theme: { textColor: '#333333', backgroundColor: '#ffffff', accentColor: '#00ffaa', boldColor: '#ff00ff', highlightColor: '#bfffea', h1Color: '#ff00ff', h2Color: '#ff00ff', h3Color: '#ff00ff' },
  },
  {
    id: 'ntr-forest',
    label: '森林清晨 (深)',
    tone: 'dark',
    theme: { textColor: '#e8f5e9', backgroundColor: '#1a2420', accentColor: '#2ecc71', boldColor: '#2ecc71', highlightColor: '#1f4e34', h1Color: '#2ecc71', h2Color: '#2ecc71', h3Color: '#2ecc71' },
  },
  {
    id: 'ntr-ocean',
    label: '深海之境 (深)',
    tone: 'dark',
    theme: { textColor: '#e6f7ff', backgroundColor: '#0a192f', accentColor: '#40a9ff', boldColor: '#40a9ff', highlightColor: '#183d63', h1Color: '#40a9ff', h2Color: '#40a9ff', h3Color: '#40a9ff' },
  },
  {
    id: 'ntr-sakura',
    label: '樱花飞舞 (深)',
    tone: 'dark',
    theme: { textColor: '#fff5f7', backgroundColor: '#1f1a1d', accentColor: '#ff69b4', boldColor: '#ff69b4', highlightColor: '#572e43', h1Color: '#ffb6c1', h2Color: '#ffb6c1', h3Color: '#ffb6c1' },
  },
  {
    id: 'ntr-starry',
    label: '星空梦境 (深)',
    tone: 'dark',
    theme: { textColor: '#f0e6ff', backgroundColor: '#0d0f1a', accentColor: '#9b59b6', boldColor: '#9b59b6', highlightColor: '#312241', h1Color: '#9370db', h2Color: '#9370db', h3Color: '#9370db' },
  },
  {
    id: 'ntr-yueling',
    label: '悦灵雅棕 (深)',
    tone: 'dark',
    theme: { textColor: '#ffffff', backgroundColor: '#1c1c1e', accentColor: '#c57512', boldColor: '#c57512', highlightColor: '#46321b', h1Color: '#f2f2f7', h2Color: '#f2f2f7', h3Color: '#f2f2f7' },
  },
];

export function getPalette(id: string | undefined): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

export function applyThemePreset(
  settings: { paletteId?: string; theme: TemplateThemeOverrides },
  preset: ThemePreset
): void {
  for (const key of THEME_COLOR_KEYS) {
    (settings.theme as unknown as Record<string, string>)[key] = '';
  }
  Object.assign(settings.theme, preset.theme);
  settings.paletteId = preset.id;
}

// Background luminance is enough to separate the light card designs from the
// dark ones; labels and chrome do not change the recommendation.
export function templateTone(background: string): PaletteTone {
  const hex = background.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 'light';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55 ? 'dark' : 'light';
}
