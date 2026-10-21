import { App, Modal, Notice } from 'obsidian';
import {
  DEFAULT_PALETTE,
  DEFAULT_PALETTE_ID,
  THEME_PRESETS,
  templateTone,
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
    contentEl.addClass('smart-red-palette-modal');
    this.titleEl.setText('配色方案');

    const tone = templateTone(this.templateBackground);
    const toneLabel = tone === 'dark' ? '深色模板' : '浅色模板';
    contentEl.createEl('p', {
      cls: 'smart-red-palette-intro',
      text: `当前模板：${this.templateName}（${toneLabel}）。深色模板优先显示深色方案，浅色模板优先显示浅色方案；默认配色保留模板原色。`,
    });

    this.renderSection(contentEl, '默认', [DEFAULT_PALETTE]);
    this.renderSection(
      contentEl,
      tone === 'dark' ? '适合深色模板' : '适合浅色模板',
      THEME_PRESETS.filter((preset) => preset.id !== DEFAULT_PALETTE_ID && preset.tone === tone)
    );
    this.renderSection(
      contentEl,
      '其他配色',
      THEME_PRESETS.filter((preset) => preset.id !== DEFAULT_PALETTE_ID && preset.tone !== tone)
    );
  }

  private renderSection(containerEl: HTMLElement, title: string, presets: ThemePreset[]): void {
    if (presets.length === 0) return;
    const section = containerEl.createDiv({ cls: 'smart-red-palette-section' });
    section.createEl('h4', { text: title });
    const grid = section.createDiv({ cls: 'smart-red-palette-grid' });
    for (const preset of presets) {
      const active = preset.id === this.currentPaletteId;
      const card = grid.createEl('button', {
        cls: `smart-red-palette-card${active ? ' is-active' : ''}`,
        attr: { type: 'button' },
      });
      const swatches = card.createDiv({ cls: 'smart-red-palette-swatches' });
      const colors = preset.id === DEFAULT_PALETTE_ID
        ? [this.templateBackground, '#b9c0c4', '#333333']
        : [preset.theme.backgroundColor, preset.theme.accentColor, preset.theme.textColor];
      for (const color of colors) {
        const swatch = swatches.createDiv({ cls: 'smart-red-palette-swatch' });
        if (color) swatch.style.backgroundColor = color;
      }
      card.createEl('span', { cls: 'smart-red-palette-name', text: preset.label });
      card.createEl('span', {
        cls: 'smart-red-palette-tone',
        text: preset.id === DEFAULT_PALETTE_ID
          ? '跟随模板'
          : preset.tone === 'dark'
            ? '深色'
            : '浅色',
      });
      card.addEventListener('click', async () => {
        const tone = templateTone(this.templateBackground);
        if (preset.tone && preset.tone !== tone) {
          new Notice('这套配色与当前模板明暗不同，已按你的选择应用。');
        }
        await this.onChoose(preset);
        this.close();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
