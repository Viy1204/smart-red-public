import { App, PluginSettingTab, Setting } from 'obsidian';
import type SmartRedPlugin from './main';
import { getTemplate, templates } from './templates/gallery';
import type { TemplateId } from './templates/utils';
import type { TemplateThemeOverrides, TemplateUserInfo } from './templates/types';

export type HeadingSplitLevel = 'h1' | 'h2';

export interface SmartRedSettings {
  template: TemplateId;
  fontSize: number;
  chromeFontSize: number;
  headingLevel: HeadingSplitLevel;
  user: TemplateUserInfo;
  theme: TemplateThemeOverrides;
  exportPixelRatio: number;
}

export const DEFAULT_SETTINGS: SmartRedSettings = {
  template: 'editorial',
  fontSize: 31,
  chromeFontSize: 22,
  headingLevel: 'h2',
  user: {
    avatar: '',
    nickname: '',
    handle: '',
    subtitle: '',
    footer: 'Smart RED',
    showHeader: true,
    showFooter: true,
    roundAvatar: true,
    verifiedBadge: false,
  },
  theme: {
    fontFamily: '',
    textColor: '',
    backgroundColor: '',
    accentColor: '',
    spacing: 24,
  },
  exportPixelRatio: 2,
};

export class SmartRedSettingTab extends PluginSettingTab {
  plugin: SmartRedPlugin;

  constructor(app: App, plugin: SmartRedPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Smart RED Settings' });
    containerEl.createEl('h3', { text: 'Template and Typography' });

    new Setting(containerEl)
      .setName('Template')
      .setDesc('Choose the card template style')
      .addDropdown((dropdown) => {
        for (const template of templates) {
          dropdown.addOption(template.name, template.displayName);
        }
        dropdown
          .setValue(getTemplate(this.plugin.settings.template).name)
          .onChange(async (value) => {
            this.plugin.settings.template = value as SmartRedSettings['template'];
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Font size')
      .setDesc('Base font size for card content (px)')
      .addSlider((slider) => {
        slider
          .setLimits(24, 42, 1)
          .setValue(this.plugin.settings.fontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Header and footer size')
      .setDesc('Font size for card chrome: author, title, footer and page number')
      .addSlider((slider) => {
        slider
          .setLimits(14, 32, 1)
          .setValue(this.plugin.settings.chromeFontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.chromeFontSize = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    containerEl.createEl('p', {
      text: 'A line with only --- starts a new card. Copy exports the current page to your clipboard; PNG downloads the current page; ZIP exports every page.',
    });

    containerEl.createEl('h3', { text: 'User Info' });

    new Setting(containerEl)
      .setName('Avatar')
      .setDesc('Image shown in the card header — a URL, a vault file name/path, or a wiki embed like avatar.png')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.user.avatar)
          .onChange(async (value) => {
            this.plugin.settings.user.avatar = value.trim();
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Nickname')
      .setDesc('Creator name shown in the card header')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.user.nickname)
          .onChange(async (value) => {
            this.plugin.settings.user.nickname = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Handle')
      .setDesc('Social handle shown as @handle under the nickname (leading @ optional)')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.user.handle ?? '')
          .onChange(async (value) => {
            this.plugin.settings.user.handle = value.trim();
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Verified badge')
      .setDesc('Show a blue verified checkmark next to the nickname')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.user.verifiedBadge ?? false)
          .onChange(async (value) => {
            this.plugin.settings.user.verifiedBadge = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Subtitle')
      .setDesc('Certification or short description under the nickname')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.user.subtitle)
          .onChange(async (value) => {
            this.plugin.settings.user.subtitle = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Footer')
      .setDesc('Footer text shown on each page')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.user.footer)
          .onChange(async (value) => {
            this.plugin.settings.user.footer = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Show header')
      .setDesc('Toggle the creator header at the top of each card')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.user.showHeader)
          .onChange(async (value) => {
            this.plugin.settings.user.showHeader = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Show footer')
      .setDesc('Toggle the footer and page number at the bottom of each card')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.user.showFooter)
          .onChange(async (value) => {
            this.plugin.settings.user.showFooter = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Round avatar')
      .setDesc('Use a circular avatar crop')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.user.roundAvatar)
          .onChange(async (value) => {
            this.plugin.settings.user.roundAvatar = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    containerEl.createEl('h3', { text: 'Custom Theme' });

    new Setting(containerEl)
      .setName('Font family')
      .setDesc('Optional CSS font stack override')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.fontFamily)
          .onChange(async (value) => {
            this.plugin.settings.theme.fontFamily = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Text color')
      .setDesc('Optional CSS color for text and headings')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.textColor)
          .onChange(async (value) => {
            this.plugin.settings.theme.textColor = value.trim();
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Background color')
      .setDesc('Optional CSS color for card background')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.backgroundColor)
          .onChange(async (value) => {
            this.plugin.settings.theme.backgroundColor = value.trim();
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Accent color')
      .setDesc('Optional CSS color for links, rules, and emphasis')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.accentColor)
          .onChange(async (value) => {
            this.plugin.settings.theme.accentColor = value.trim();
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Paragraph spacing')
      .setDesc('Paragraph gap in px')
      .addSlider((slider) => {
        slider
          .setLimits(12, 40, 1)
          .setValue(this.plugin.settings.theme.spacing)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.theme.spacing = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    containerEl.createEl('h3', { text: 'Export' });

    new Setting(containerEl)
      .setName('Export scale')
      .setDesc('PNG pixel ratio. 2 exports 2160 x 2880 images.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('1', '1x')
          .addOption('2', '2x')
          .addOption('3', '3x')
          .setValue(String(this.plugin.settings.exportPixelRatio))
          .onChange(async (value) => {
            this.plugin.settings.exportPixelRatio = parseInt(value, 10) || 2;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });
  }
}
