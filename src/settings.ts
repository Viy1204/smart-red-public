import { App, PluginSettingTab, Setting, type DropdownComponent } from 'obsidian';
import type SmartRedPlugin from './main';
import { getTemplate, templates } from './templates/gallery';
import type { TemplateId } from './templates/utils';
import type { TemplateThemeOverrides, TemplateUserInfo } from './templates/types';
import {
  DEFAULT_PALETTE,
  DEFAULT_PALETTE_ID,
  THEME_PRESETS,
  applyThemePreset,
  getPalette,
  templateTone,
} from './palettes';

export { THEME_PRESETS, type ThemePreset } from './palettes';
import {
  DEFAULT_FRESH_READING,
  FRESH_DESIGN,
  FRESH_TEMPLATE_ID,
  READING_PRESETS,
  getActiveTypography,
  readingPresetId,
  usesOwnPalette,
  type FreshReadingSettings,
} from './typography';

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
  // 'template' keeps each design's own palette; 'custom' means the color
  // fields were edited by hand; any other id is one of THEME_PRESETS.
  paletteId: string;
  freshReading: FreshReadingSettings;
  cover: CoverSettings;
  topSafeArea: number;
  // 0 keeps the template's designed side padding; a positive value overrides
  // the left and right padding for every card.
  sidePadding: number;
  avoidWidows: boolean;
  exportPixelRatio: number;
}


export const DEFAULT_SETTINGS: SmartRedSettings = {
  template: FRESH_TEMPLATE_ID,
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
  paletteId: DEFAULT_PALETTE_ID,
  freshReading: { ...DEFAULT_FRESH_READING },
  cover: {
    enabled: true,
    showAuthor: true,
    hideFirstHeading: true,
  },
  topSafeArea: 0,
  sidePadding: 0,
  avoidWidows: true,
  theme: {
    fontFamily: '',
    textColor: '',
    backgroundColor: '',
    accentColor: '',
    boldColor: '',
    highlightColor: '',
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
          this.plugin.settings.paletteId = 'custom';
          await this.plugin.saveSettings();
          this.plugin.refreshView();
        })
      )
      .addExtraButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('恢复模板默认')
          .onClick(async () => {
            set('');
            this.plugin.settings.paletteId = 'custom';
            await this.plugin.saveSettings();
            this.plugin.refreshView();
            this.display();
          })
      );
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const fresh = this.plugin.settings.template === FRESH_TEMPLATE_ID;
    const ownPalette = usesOwnPalette(this.plugin.settings.template);
    const reading = this.plugin.settings.freshReading;
    const typography = getActiveTypography(this.plugin.settings);
    let readingDropdown: DropdownComponent | undefined;
    new Setting(containerEl).setName('模板与排版').setHeading();

    new Setting(containerEl)
      .setName('模板')
      .setDesc('选择卡片模板；鼠标悬停可查看模板说明。')
      .addDropdown((dropdown) => {
        for (const template of templates) {
          dropdown.addOption(template.name, template.displayName);
        }
        dropdown
          .setValue(getTemplate(this.plugin.settings.template).name)
          .onChange(async (value) => {
            const nextTemplate = getTemplate(value);
            this.plugin.settings.template = nextTemplate.name as SmartRedSettings['template'];
            const palette = getPalette(this.plugin.settings.paletteId);
            if (palette?.tone && palette.tone !== templateTone(nextTemplate.backgroundColor)) {
              applyThemePreset(this.plugin.settings, DEFAULT_PALETTE);
            }
            await this.plugin.saveSettings();
            this.plugin.refreshView();
            this.display();
          });
      });

    const selectedTemplate = getTemplate(this.plugin.settings.template);
    if (selectedTemplate.description) {
      containerEl.createEl('p', {
        cls: 'setting-item-description',
        text: selectedTemplate.description,
      });
    }

    if (fresh) {
      new Setting(containerEl)
        .setName('阅读档位')
        .setDesc('清爽编辑版独立保存字号与段距；更改正文后，标题会同步调整。')
        .addDropdown((dropdown) => {
          readingDropdown = dropdown;
          dropdown.addOption('custom', '自定义');
          dropdown.selectEl.options[0].disabled = true;
          for (const [id, preset] of Object.entries(READING_PRESETS)) {
            dropdown.addOption(id, preset.label);
          }
          dropdown.setValue(readingPresetId(reading)).onChange(async (value) => {
            if (value !== 'comfortable' && value !== 'compact') return;
            const preset = READING_PRESETS[value];
            this.plugin.settings.freshReading = {
              ...this.plugin.settings.freshReading,
              fontSize: preset.fontSize,
              spacing: preset.spacing,
            };
            await this.plugin.saveSettings();
            this.plugin.refreshView();
            this.display();
          });
        });

      for (const field of [
        { key: 'headingFontFamily' as const, name: '标题字体', fallback: FRESH_DESIGN.displayFont },
        { key: 'bodyFontFamily' as const, name: '正文字体', fallback: FRESH_DESIGN.bodyFont },
      ]) {
        new Setting(containerEl)
          .setName(field.name)
          .setDesc('填写已安装字体的 CSS 字体栈；留空恢复默认。字体缺失时使用系统回退。')
          .addText((text) => {
            text.setPlaceholder(field.fallback).setValue(reading[field.key]);
            text.inputEl.addEventListener('change', async () => {
              this.plugin.settings.freshReading[field.key] = text.getValue().trim();
              await this.plugin.saveSettings();
              this.plugin.refreshView();
            });
          });
      }
    }

    new Setting(containerEl)
      .setName('正文字号')
      .setDesc(fresh ? '1080px 画布中的字号；标题按比例联动，原有模板设置单独保留。' : '卡片正文的基础字号（px）')
      .addSlider((slider) => {
        slider
          .setLimits(fresh ? FRESH_DESIGN.minFontSize : 24, fresh ? FRESH_DESIGN.maxFontSize : 42, 1)
          .setValue(typography.fontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (fresh) {
              this.plugin.settings.freshReading.fontSize = value;
              readingDropdown?.setValue(readingPresetId(this.plugin.settings.freshReading));
            } else this.plugin.settings.fontSize = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('页眉与页脚字号')
      .setDesc('作者、文章标题、页脚和页码的字号')
      .addSlider((slider) => {
        slider
          .setLimits(14, fresh ? 32 : 36, 1)
          .setValue(typography.chromeFontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (fresh) this.plugin.settings.freshReading.chromeFontSize = value;
            else this.plugin.settings.chromeFontSize = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl)
      .setName('保留单行换行')
      .setDesc(
        '段落内单独一个换行也按换行显示，与关闭“严格换行”的 Obsidian 一致。关闭后按 CommonMark 处理：只有行尾两个空格或反斜杠才换行。'
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
      text: '单独一行 --- 会开始新的一页。复制导出当前页到剪贴板；PNG 导出当前页；ZIP 导出全部页面。',
    });

    new Setting(containerEl).setName('作者信息').setHeading();

    new Setting(containerEl)
      .setName('头像')
      .setDesc('显示在卡片页眉的图片：可填 URL、笔记库中的文件名/路径，或 avatar.png 形式的嵌入。')
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
      .setName('昵称')
      .setDesc('显示在卡片页眉的作者名')
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
      .setName('账号')
      .setDesc('显示在昵称下方的 @账号（开头 @ 可省略）')
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
      .setName('认证标记')
      .setDesc('在昵称旁显示蓝色认证勾')
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
      .setName('副标题')
      .setDesc('昵称下方的认证信息或一句话简介')
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
      .setName('页脚')
      .setDesc('每页底部显示的页脚文字')
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
      .setName('显示页眉')
      .setDesc('显示每页顶部的作者信息')
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
      .setName('显示页脚')
      .setDesc('显示每页底部的页脚和页码')
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
      .setName('圆形头像')
      .setDesc('头像使用圆形裁切')
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
      .setName('顶部安全区')
      .setDesc('在卡片顶部预留的空白（px），避免小红书 AI 内容提示遮住标题')
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

    new Setting(containerEl).setName('封面').setHeading();

    new Setting(containerEl)
      .setName('启用封面')
      .setDesc('在正文前添加一页大字标题封面（导出为 <标题>-00.png）。正文第一页仍保留标题。')
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
      .setName('封面显示作者')
      .setDesc('在封面底部显示头像、昵称和账号')
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
      .setName('封面下不重复标题')
      .setDesc('启用封面后，正文第一页的第一个一级标题会与封面重复')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.cover.hideFirstHeading !== false)
          .onChange(async (value) => {
            this.plugin.settings.cover.hideFirstHeading = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl).setName('配色方案').setHeading();
    if (ownPalette) {
      containerEl.createEl('p', {
        text: fresh
          ? '默认保留清爽编辑版自己的冷浅灰与深青。也可以在上方选择其他配色；深色模板建议搭配深色方案。'
          : '默认保留该模板自带的配色与字体搭配。也可以在上方选择其他配色；深色模板建议搭配深色方案。',
      });
    }

    new Setting(containerEl)
      .setName('配色预设')
      .setDesc('“默认配色”保留模板原色；深色模板建议选深色方案，浅色模板建议选浅色方案。')
      .addDropdown((dropdown) => {
        dropdown.addOption(DEFAULT_PALETTE_ID, '默认配色');
        for (const preset of THEME_PRESETS) {
          if (preset.id !== DEFAULT_PALETTE_ID) dropdown.addOption(preset.id, preset.label);
        }
        dropdown.addOption('custom', '自定义');
        dropdown.selectEl.options[dropdown.selectEl.options.length - 1].disabled = true;
        const current = getPalette(this.plugin.settings.paletteId)?.id ?? 'custom';
        dropdown.setValue(current).onChange(async (value) => {
          const preset = getPalette(value);
          if (!preset) return;
          applyThemePreset(this.plugin.settings, preset);
          await this.plugin.saveSettings();
          this.plugin.refreshView();
          this.display();
        });
      });

    const themeContainer = containerEl.createDiv();
    themeContainer.hidden = ownPalette;
    new Setting(themeContainer).setName('手动配色').setHeading();

    new Setting(themeContainer)
      .setName('字体')
      .setDesc('可选：覆盖 CSS 字体栈')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.fontFamily)
          .onChange(async (value) => {
            this.plugin.settings.theme.fontFamily = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(themeContainer)
      .setName('文字颜色')
      .setDesc('可选：正文和标题的文字颜色')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.textColor)
          .onChange(async (value) => {
            this.plugin.settings.theme.textColor = value.trim();
            this.plugin.settings.paletteId = 'custom';
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(themeContainer)
      .setName('背景颜色')
      .setDesc('可选：卡片背景颜色')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.backgroundColor)
          .onChange(async (value) => {
            this.plugin.settings.theme.backgroundColor = value.trim();
            this.plugin.settings.paletteId = 'custom';
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(themeContainer)
      .setName('强调色')
      .setDesc('可选：链接、分隔线和强调元素的颜色')
      .addText((text) => {
        text
          .setValue(this.plugin.settings.theme.accentColor)
          .onChange(async (value) => {
            this.plugin.settings.theme.accentColor = value.trim();
            this.plugin.settings.paletteId = 'custom';
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    this.colorSetting(
      themeContainer,
      '加粗颜色',
      '**加粗**文字的颜色；可恢复模板默认',
      () => this.plugin.settings.theme.boldColor ?? '',
      (value) => { this.plugin.settings.theme.boldColor = value; }
    );

    this.colorSetting(
      themeContainer,
      '高亮颜色',
      '==高亮==文字的背景色；可恢复模板默认',
      () => this.plugin.settings.theme.highlightColor ?? '',
      (value) => { this.plugin.settings.theme.highlightColor = value; }
    );

    this.colorSetting(
      themeContainer,
      '一级标题颜色',
      '# 一级标题的颜色；可恢复模板默认',
      () => this.plugin.settings.theme.h1Color ?? '',
      (value) => { this.plugin.settings.theme.h1Color = value; }
    );

    this.colorSetting(
      themeContainer,
      '二级标题颜色',
      '## 二级标题的颜色；可恢复模板默认',
      () => this.plugin.settings.theme.h2Color ?? '',
      (value) => { this.plugin.settings.theme.h2Color = value; }
    );

    this.colorSetting(
      themeContainer,
      '三级标题颜色',
      '### 三级标题的颜色；可恢复模板默认',
      () => this.plugin.settings.theme.h3Color ?? '',
      (value) => { this.plugin.settings.theme.h3Color = value; }
    );

    new Setting(containerEl)
      .setName('段落间距')
      .setDesc('段落之间的间距（px）')
      .addSlider((slider) => {
        slider
          .setLimits(12, 40, 1)
          .setValue(fresh ? reading.spacing : this.plugin.settings.theme.spacing)
          .setDynamicTooltip()
          .onChange(async (value) => {
            if (fresh) {
              this.plugin.settings.freshReading.spacing = value;
              readingDropdown?.setValue(readingPresetId(this.plugin.settings.freshReading));
            } else this.plugin.settings.theme.spacing = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    const templateSide = getTemplate(this.plugin.settings.template).cardPadding;
    const effectiveSide = this.plugin.settings.sidePadding || templateSide;
    new Setting(containerEl)
      .setName('左右边距')
      .setDesc('卡片左右留白（px）；点击右侧按钮恢复模板默认。')
      .addSlider((slider) => {
        slider
          .setLimits(40, 140, 2)
          .setValue(Math.min(140, Math.max(40, effectiveSide)))
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.sidePadding = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      })
      .addExtraButton((button) =>
        button
          .setIcon('rotate-ccw')
          .setTooltip('恢复模板默认边距')
          .onClick(async () => {
            this.plugin.settings.sidePadding = 0;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName('避免孤行')
      .setDesc('段落跨页时，避免把最后一行单独留在下一张卡片；开启后页面底部可能多留一点空白。')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.avoidWidows !== false)
          .onChange(async (value) => {
            this.plugin.settings.avoidWidows = value;
            await this.plugin.saveSettings();
            this.plugin.refreshView();
          });
      });

    new Setting(containerEl).setName('导出').setHeading();

    new Setting(containerEl)
      .setName('导出倍率')
      .setDesc('PNG 像素倍率；2 倍导出 2160 × 2880 图片。')
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
