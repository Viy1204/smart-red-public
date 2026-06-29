import { Plugin } from 'obsidian';
import { RedView, VIEW_TYPE_SMART_RED } from './view';
import { SmartRedSettingTab, DEFAULT_SETTINGS, type SmartRedSettings } from './settings';
import { getTemplate } from './templates/gallery';

function normalizeSettings(raw: Partial<SmartRedSettings> & { headingLevel?: unknown }): SmartRedSettings {
  const headingLevel = raw.headingLevel === 'h1' || raw.headingLevel === 1 ? 'h1' : 'h2';
  const exportPixelRatio = typeof raw.exportPixelRatio === 'number' ? raw.exportPixelRatio : DEFAULT_SETTINGS.exportPixelRatio;
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    template: getTemplate(raw.template).name as SmartRedSettings['template'],
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
      name: 'Open preview',
      callback: async () => {
        await this.activateView();
      },
    });

    this.addRibbonIcon('image', 'Open preview', async () => {
      await this.activateView();
    });

    this.addSettingTab(new SmartRedSettingTab(this.app, this));
  }

  async onunload() {
  }

  async loadSettings() {
    this.settings = normalizeSettings(await this.loadData());
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
