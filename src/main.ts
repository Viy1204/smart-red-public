import { Plugin } from 'obsidian';
import { RedView, VIEW_TYPE_SMART_RED } from './view';
import { SmartRedSettingTab, DEFAULT_SETTINGS, type SmartRedSettings } from './settings';
import { getTemplate } from './templates/gallery';
import { normalizeFreshReading, usesOwnPalette } from './typography';
import { THEME_COLOR_KEYS } from './palettes';

function normalizeSettings(raw: Partial<SmartRedSettings> & { headingLevel?: unknown }): SmartRedSettings {
  const headingLevel = raw.headingLevel === 'h1' || raw.headingLevel === 1 ? 'h1' : 'h2';
  const exportPixelRatio = typeof raw.exportPixelRatio === 'number' ? raw.exportPixelRatio : DEFAULT_SETTINGS.exportPixelRatio;
  const template = getTemplate(raw.template ?? DEFAULT_SETTINGS.template).name as SmartRedSettings['template'];
  const hasCustomColors = THEME_COLOR_KEYS.some(
    (key) => typeof raw.theme?.[key] === 'string' &&
      !!raw.theme[key].trim()
  );
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    template,
    paletteId: typeof raw.paletteId === 'string' && raw.paletteId.trim()
      ? raw.paletteId.trim()
      : hasCustomColors && !usesOwnPalette(template)
        ? 'custom'
        : DEFAULT_SETTINGS.paletteId,
    freshReading: normalizeFreshReading(raw.freshReading),
    sidePadding: typeof raw.sidePadding === 'number' && Number.isFinite(raw.sidePadding)
      ? Math.min(160, Math.max(0, Math.round(raw.sidePadding)))
      : DEFAULT_SETTINGS.sidePadding,
    avoidWidows: raw.avoidWidows !== false,
    fontSize: typeof raw.fontSize === 'number' && raw.fontSize >= 24 ? raw.fontSize : DEFAULT_SETTINGS.fontSize,
    chromeFontSize: typeof raw.chromeFontSize === 'number' && raw.chromeFontSize >= 14
      ? raw.chromeFontSize
      : DEFAULT_SETTINGS.chromeFontSize,
    headingLevel,
    user: {
      ...DEFAULT_SETTINGS.user,
      ...(raw.user || {}),
    },
    theme: {
      ...DEFAULT_SETTINGS.theme,
      ...(raw.theme || {}),
    },
    cover: {
      ...DEFAULT_SETTINGS.cover,
      ...(raw.cover || {}),
    },
    topSafeArea: typeof raw.topSafeArea === 'number' && raw.topSafeArea >= 0
      ? raw.topSafeArea
      : DEFAULT_SETTINGS.topSafeArea,
    exportPixelRatio,
  };
}

export default class SmartRedPlugin extends Plugin {
  settings: SmartRedSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_SMART_RED,
      (leaf) => new RedView(leaf, this.settings, async (settings) => {
        this.settings = settings;
        await this.saveSettings();
      })
    );

    this.addCommand({
      id: 'open-preview',
      name: '打开预览',
      callback: async () => {
        await this.activateView();
      },
    });

    this.addRibbonIcon('image', 'Smart RED', async () => {
      await this.activateView();
    });

    this.addSettingTab(new SmartRedSettingTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_SMART_RED);
  }

  async loadSettings() {
    this.settings = normalizeSettings((await this.loadData()) ?? {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  refreshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SMART_RED);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof RedView) {
        view.setSettings(this.settings);
      }
    }
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SMART_RED);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }

    const rightLeaf = this.app.workspace.getRightLeaf(false);
    if (rightLeaf) {
      await rightLeaf.setViewState({
        type: VIEW_TYPE_SMART_RED,
        active: false,
      });
      this.app.workspace.revealLeaf(rightLeaf);
    }
  }
}
