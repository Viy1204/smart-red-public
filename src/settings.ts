import { App, PluginSettingTab, Setting } from 'obsidian';
import type SmartRedPlugin from './main';
import { getTemplate, templates } from './templates/gallery';
import type { TemplateId } from './templates/utils';
import type { TemplateThemeOverrides, TemplateUserInfo } from './templates/types';

export type HeadingSplitLevel = 'h1' | 'h2';

export interface CoverSettings {
  enabled: boolean;
  showAuthor: boolean;
  // The cover already renders the title as a full-bleed headline, so the source
  // H1 would show it a second time on the first content card.
  hideFirstHeading: boolean;
}

export interface SmartRedSettings {
  template: TemplateId;
  fontSize: number;
  chromeFontSize: number;
  headingLevel: HeadingSplitLevel;
  // Obsidian ships with "Strict line breaks" off, so a single newline shows as a
  // break in the editor. Match that instead of CommonMark's fold-to-space.
  softLineBreaks: boolean;
  user: TemplateUserInfo;
  theme: TemplateThemeOverrides;
  cover: CoverSettings;
  topSafeArea: number;
  exportPixelRatio: number;
}

// One-click color palettes ported from note-to-red's built-in themes. They
// fill the Custom Theme fields below; templates keep their own quote/code
// backgrounds, so presets pair best with templates of matching lightness.
export interface ThemePreset {
  id: string;
  label: string;
  theme: Partial<TemplateThemeOverrides>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ntr-default',
    label: '深夜备忘 (深)',
    theme: { textColor: '#f2f2f7', backgroundColor: '#1c1c1e', accentColor: '#0a84ff', boldColor: '#0a84ff', h1Color: '#f2f2f7', h2Color: '#f2f2f7', h3Color: '#f2f2f7' },
  },
  {
    id: 'ntr-minimal',
    label: '极简白',
    theme: { textColor: '#333333', backgroundColor: '#ffffff', accentColor: '#6c9eb8', boldColor: '#4a4a4a', h1Color: '#333333', h2Color: '#333333', h3Color: '#333333' },
  },
  {
    id: 'ntr-elegant',
    label: '优雅紫黑 (深)',
    theme: { textColor: '#c4b8dd', backgroundColor: '#1a1721', accentColor: '#b490ff', boldColor: '#b490ff', h1Color: '#e2d9f3', h2Color: '#e2d9f3', h3Color: '#e2d9f3' },
  },
  {
    id: 'ntr-cyber',
    label: '赛博朋克',
    theme: { textColor: '#333333', backgroundColor: '#ffffff', accentColor: '#00ffaa', boldColor: '#ff00ff', h1Color: '#ff00ff', h2Color: '#ff00ff', h3Color: '#ff00ff' },
  },
  {
    id: 'ntr-forest',
    label: '森林清晨 (深)',
    theme: { textColor: '#e8f5e9', backgroundColor: '#1a2420', accentColor: '#2ecc71', boldColor: '#2ecc71', h1Color: '#2ecc71', h2Color: '#2ecc71', h3Color: '#2ecc71' },
  },
  {
    id: 'ntr-ocean',
    label: '深海之境 (深)',
    theme: { textColor: '#e6f7ff', backgroundColor: '#0a192f', accentColor: '#40a9ff', boldColor: '#40a9ff', h1Color: '#40a9ff', h2Color: '#40a9ff', h3Color: '#40a9ff' },
  },
  {
    id: 'ntr-sakura',
    label: '樱花飞舞 (深)',
    theme: { textColor: '#fff5f7', backgroundColor: '#1f1a1d', accentColor: '#ff69b4', boldColor: '#ff69b4', h1Color: '#ffb6c1', h2Color: '#ffb6c1', h3Color: '#ffb6c1' },
  },
  {
    id: 'ntr-starry',
    label: '星空梦境 (深)',
    theme: { textColor: '#f0e6ff', backgroundColor: '#0d0f1a', accentColor: '#9b59b6', boldColor: '#9b59b6', h1Color: '#9370db', h2Color: '#9370db', h3Color: '#9370db' },
  },
  {
    id: 'ntr-yueling',
    label: '悦灵雅棕 (深)',
    theme: { textColor: '#ffffff', backgroundColor: '#1c1c1e', accentColor: '#c57512', boldColor: '#c57512', h1Color: '#f2f2f7', h2Color: '#f2f2f7', h3Color: '#f2f2f7' },
  },
];

export const DEFAULT_SETTINGS: SmartRedSettings = {
  template: 'editorial',
  fontSize: 31,
  chromeFontSize: 22,
  headingLevel: 'h2',
  softLineBreaks: true,
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
  cover: {
    enabled: false,
    showAuthor: true,
    hideFirstHeading: true,
  },
  topSafeArea: 0,
  theme: {
    fontFamily: '',
    textColor: '',
    backgroundColor: '',
    accentColor: '',
    boldColor: '',
    h1Color: '',
    h2Color: '',
    h3Color: '',
    spacing: 28,
  },
  exportPixelRatio: 2,
};

export class SmartRedSettingTab extends PluginSettingTab {
  plugin: SmartRedPlugin;

  constructor(app: App, plugin: SmartRedPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private colorSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    get: () => string,
    set: (value: string) => void
  ): void {
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addColorPicker((picker) =>
        picker.setValue(get() || '#888888').onChange(async (value) => {
          set(value);
          await this.plugin.saveSettings();
          this.plugin.refreshView();
        })
      )
      .addExtraButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('Reset to template default')
          .onClick(async () => {
            set('');
            await this.plugin.saveSettings();
            this.plugin.refreshView();
            this.display();
          })
      );
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName('Template and Typography').setHeading();

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
          .setLimits(14, 36, 1)
          .setValue(this.plugin.settings.chromeFontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.chromeFontSize = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Keep single line breaks')
      .setDesc(
        'A lone newline inside a paragraph shows as a line break, matching Obsidian with "Strict line breaks" off. Turn this off for CommonMark behaviour, where only two trailing spaces or a backslash break a line.'
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.softLineBreaks !== false)
          .onChange(async (value) => {
            this.plugin.settings.softLineBreaks = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    containerEl.createEl('p', {
      text: 'A line with only --- starts a new card. Copy exports the current page to your clipboard; PNG downloads the current page; ZIP exports every page.',
    });

    new Setting(containerEl).setName('User Info').setHeading();

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

    new Setting(containerEl)
      .setName('Top safe area')
      .setDesc('Blank reserved at the very top (px) so the Xiaohongshu AI-content banner covers empty space instead of your title')
      .addSlider((slider) =>
        slider
          .setLimits(0, 240, 10)
          .setValue(this.plugin.settings.topSafeArea ?? 0)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.topSafeArea = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          })
      );

    new Setting(containerEl).setName('Cover Page').setHeading();

    new Setting(containerEl)
      .setName('Enable cover')
      .setDesc('Prepend a big-type title card (exported as <title>-00.png). The title also stays on the first content page.')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.cover.enabled)
          .onChange(async (value) => {
            this.plugin.settings.cover.enabled = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Author card on cover')
      .setDesc('Show avatar, nickname and handle at the bottom of the cover')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.cover.showAuthor)
          .onChange(async (value) => {
            this.plugin.settings.cover.showAuthor = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('Drop the title heading')
      .setDesc('With a cover, the first H1 would repeat the title on the first content card')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.cover.hideFirstHeading !== false)
          .onChange(async (value) => {
            this.plugin.settings.cover.hideFirstHeading = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl).setName('Custom Theme').setHeading();

    new Setting(containerEl)
      .setName('Theme preset')
      .setDesc('One-click palettes ported from note-to-red. Fills the color fields below; light palettes pair best with light templates.')
      .addDropdown((dropdown) => {
        dropdown.addOption('', 'Custom');
        for (const preset of THEME_PRESETS) {
          dropdown.addOption(preset.id, preset.label);
        }
        dropdown.setValue('').onChange(async (value) => {
          const preset = THEME_PRESETS.find((p) => p.id === value);
          if (!preset) return;
          this.plugin.settings.theme = {
            ...this.plugin.settings.theme,
            ...preset.theme,
          };
          await this.plugin.saveSettings();
          this.plugin.refreshView();
          this.display();
        });
      });

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

    this.colorSetting(
      containerEl,
      'Bold color',
      'Pick a color for **bold** text; reset to inherit the body color',
      () => this.plugin.settings.theme.boldColor ?? '',
      (value) => { this.plugin.settings.theme.boldColor = value; }
    );

    this.colorSetting(
      containerEl,
      'Heading 1 color',
      '# H1 color; reset to the template default',
      () => this.plugin.settings.theme.h1Color ?? '',
      (value) => { this.plugin.settings.theme.h1Color = value; }
    );

    this.colorSetting(
      containerEl,
      'Heading 2 color',
      '## H2 color; reset to the template default',
      () => this.plugin.settings.theme.h2Color ?? '',
      (value) => { this.plugin.settings.theme.h2Color = value; }
    );

    this.colorSetting(
      containerEl,
      'Heading 3 color',
      '### H3 color; reset to the template default',
      () => this.plugin.settings.theme.h3Color ?? '',
      (value) => { this.plugin.settings.theme.h3Color = value; }
    );

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

    new Setting(containerEl).setName('Export').setHeading();

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
