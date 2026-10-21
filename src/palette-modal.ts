import { App, Modal, Notice } from 'obsidian';
import {
  DEFAULT_PALETTE,
  DEFAULT_PALETTE_ID,
  THEME_PRESETS,
  getPalette,
  templateTone,
  type PaletteTone,
  type ThemePreset,
} from './palettes';

export class PaletteModal extends Modal {
  constructor(
    app: App,
    private readonly templateBackground: string,
    private readonly templateName: string,
    private readonly currentPaletteId: string,
    private readonly onChoose: (preset: ThemePreset) => void | Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('smart-red-palette-dialog');
    contentEl.addClass('smart-red-palette-modal');
    this.titleEl.setText('配色');
    contentEl.createEl('p', {
      cls: 'smart-red-palette-caption',
      text: this.templateName,
    });

    const reset = this.createOption(contentEl, DEFAULT_PALETTE, 'smart-red-palette-reset');
    reset.createEl('span', { cls: 'smart-red-palette-name', text: DEFAULT_PALETTE.label });

    const initialTone = getPalette(this.currentPaletteId)?.tone ?? templateTone(this.templateBackground);
    const segments = contentEl.createDiv({
      cls: 'smart-red-palette-segments',
      attr: { role: 'group', 'aria-label': '配色明暗' },
    });
    const grid = contentEl.createDiv({
      cls: 'smart-red-palette-grid',
      attr: { role: 'group' },
    });
    for (const [tone, label] of [['light', '浅色'], ['dark', '深色']] as const) {
      const segment = segments.createEl('button', {
        text: label,
        attr: {
          type: 'button',
          'aria-label': label,
          'aria-pressed': String(tone === initialTone),
        },
      });
      segment.addEventListener('click', () => {
        for (const button of segments.querySelectorAll('button')) {
          button.setAttribute('aria-pressed', String(button === segment));
        }
        this.renderGrid(grid, tone);
      });
    }
    this.renderGrid(grid, initialTone);
  }

  private createOption(containerEl: HTMLElement, preset: ThemePreset, cls: string): HTMLButtonElement {
    const active = preset.id === this.currentPaletteId;
    const button = containerEl.createEl('button', {
      cls: `${cls}${active ? ' is-active' : ''}`,
      attr: {
        type: 'button',
        'aria-label': preset.label.replace(/\s*\(深\)$/, ''),
        'aria-pressed': String(active),
      },
    });
    if (active) {
      button.createEl('span', {
        cls: 'smart-red-palette-check',
        text: '✓',
        attr: { 'aria-hidden': 'true' },
      });
    }
    button.addEventListener('click', async () => {
      if (preset.tone && preset.tone !== templateTone(this.templateBackground)) {
        new Notice('这套配色与当前模板明暗不同，已按你的选择应用。');
      }
      await this.onChoose(preset);
      this.close();
    });
    return button;
  }

  private renderGrid(grid: HTMLElement, tone: PaletteTone): void {
    grid.empty();
    grid.setAttribute('aria-label', tone === 'dark' ? '深色配色' : '浅色配色');
    for (const preset of THEME_PRESETS.filter((preset) => preset.id !== DEFAULT_PALETTE_ID && preset.tone === tone)) {
      const card = this.createOption(grid, preset, 'smart-red-palette-card');
      const swatches = card.createDiv({
        cls: 'smart-red-palette-swatches',
        attr: { 'aria-hidden': 'true' },
      });
      for (const color of [preset.theme.backgroundColor, preset.theme.accentColor, preset.theme.textColor]) {
        const swatch = swatches.createDiv({ cls: 'smart-red-palette-swatch' });
        if (color) swatch.style.backgroundColor = color;
      }
      card.createEl('span', {
        cls: 'smart-red-palette-name',
        text: preset.label.replace(/\s*\(深\)$/, ''),
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
