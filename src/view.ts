import { ItemView, WorkspaceLeaf, TFile, debounce, Notice } from 'obsidian';
import { MarkdownParser } from './markdown-parser';
import {
  paginateMeasured,
  normalizeParagraphFragments,
  type PaginationDecision,
} from './pagination-engine';
import {
  TemplateRenderer,
  CARD_WIDTH,
  CARD_HEIGHT,
  computeHeaderReserve,
  footerReservePx,
} from './template-renderer';
import { ExportPipeline, pageFileName, sanitizeFileName } from './export-pipeline';
import { copyPngBlobToClipboard } from './clipboard';
import { getTemplate, templates } from './templates/gallery';
import { stripInlineMarkdown } from './templates/utils';
import { buildRenderSegments } from './section-splitter';
import type { SmartRedSettings } from './settings';
import type { TemplateRenderContext } from './templates/types';
import { BlockType, type SemanticBlock } from './types';

export const VIEW_TYPE_SMART_RED = 'smart-red-preview';

const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE = 42;
const MIN_CHROME_FONT_SIZE = 14;
const MAX_CHROME_FONT_SIZE = 32;
const PAGE_SAFETY_PX = 0;
const IMAGE_MAX_HEIGHT = 960;
const IMAGE_LOAD_TIMEOUT_MS = 1600;

// Brand display fonts are loaded from styles.css so Obsidian can manage them.

// Convert an absolute filesystem path (Windows drive, UNC, or POSIX) to a
// file:// URL the renderer can load. Returns null for anything else (URLs,
// vault-relative paths, wiki links) so the caller can keep its own resolution.
export function absolutePathToFileUrl(raw: string): string | null {
  const winAbs = /^[a-zA-Z]:[\\/]/.test(raw);
  const uncAbs = raw.startsWith('\\\\');
  const posixAbs = raw.startsWith('/');
  if (!winAbs && !uncAbs && !posixAbs) return null;
  const slashed = raw.replace(/\\/g, '/');
  const encoded = encodeURI(slashed).replace(/#/g, '%23').replace(/\?/g, '%3F');
  return winAbs ? `file:///${encoded}` : `file://${encoded}`;
}

const FONT_OPTIONS = [
  { label: 'Default', value: '', primary: '' },
  { label: '系统黑体', value: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif', primary: 'PingFang SC' },
  { label: '苹方雅黑', value: '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif', primary: 'PingFang SC' },
  { label: '思源黑体', value: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif', primary: 'Source Han Sans SC' },
  { label: '思源宋体', value: '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif', primary: 'Source Han Serif SC' },
  { label: '霞鹜文楷', value: '"LXGW WenKai", "LXGW WenKai Screen", "Kaiti SC", "KaiTi", serif', primary: 'LXGW WenKai' },
  { label: 'HarmonyOS', value: '"HarmonyOS Sans SC", "HarmonyOS Sans", "PingFang SC", sans-serif', primary: 'HarmonyOS Sans SC' },
  { label: '阿里普惠', value: '"Alibaba PuHuiTi", "Alibaba PuHuiTi 2.0", "Microsoft YaHei", sans-serif', primary: 'Alibaba PuHuiTi' },
  { label: '宋体仿宋', value: '"Songti SC", "STSong", "FangSong", "FangSong_GB2312", serif', primary: 'Songti SC' },
  { label: '等宽', value: '"SF Mono", Menlo, Monaco, Consolas, "Noto Sans Mono CJK SC", monospace', primary: 'SF Mono' },
];

export class RedView extends ItemView {
  private pluginSettings: SmartRedSettings;
  private onSettingsChange: ((settings: SmartRedSettings) => Promise<void> | void) | null;
  private parser: MarkdownParser;
  private renderer: TemplateRenderer;
  private exporter: ExportPipeline;
  private decisions: PaginationDecision[] = [];
  private currentPageIndex = 0;
  private isLocked = false;
  private debouncedRefresh: () => void;
  private pendingRaf: number | null = null;
  private previewContainer: HTMLElement | null = null;
  private navIndicator: HTMLElement | null = null;
  private lockBtn: HTMLElement | null = null;
  private copyBtn: HTMLButtonElement | null = null;
  private pngBtn: HTMLButtonElement | null = null;
  private zipBtn: HTMLButtonElement | null = null;
  private templateSelect: HTMLSelectElement | null = null;
  private fontSizeLabel: HTMLElement | null = null;
  private chromeSizeLabel: HTMLElement | null = null;
  private fontFamilySelect: HTMLSelectElement | null = null;
  private emptyStateEl: HTMLElement | null = null;
  private currentPageEl: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private documentTitle = 'Smart RED';
  private renderSeq = 0;
  private lastRenderKey: string | null = null;
  // Avatar source resolved against the active note and pre-validated to load;
  // empty string when unset or the image failed (so we never ship a broken icon).
  private resolvedAvatar = '';

  constructor(
    leaf: WorkspaceLeaf,
    settings: SmartRedSettings,
    onSettingsChange?: (settings: SmartRedSettings) => Promise<void> | void
  ) {
    super(leaf);
    this.pluginSettings = this.normalizeSettings(settings);
    this.onSettingsChange = onSettingsChange ?? null;
    this.parser = new MarkdownParser();
    this.renderer = new TemplateRenderer();
    this.exporter = new ExportPipeline({ pixelRatio: this.pluginSettings.exportPixelRatio });
    this.debouncedRefresh = debounce(() => this.refreshPreview(), 300, true);
  }

  getViewType(): string {
    return VIEW_TYPE_SMART_RED;
  }

  getDisplayText(): string {
    return 'Smart RED Preview';
  }

  getIcon(): string {
    return 'image';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('smart-red-view');

    const toolbar = container.createEl('div', { cls: 'smart-red-toolbar' });
    const navRow = toolbar.createEl('div', {
      cls: 'smart-red-toolbar-row smart-red-toolbar-row-primary',
    });
    const toolRow = toolbar.createEl('div', {
      cls: 'smart-red-toolbar-row smart-red-toolbar-row-secondary',
    });
    const navGroup = navRow.createEl('div', { cls: 'smart-red-toolbar-group smart-red-nav-group' });

    this.lockBtn = navGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-lock-btn',
      text: 'Lock',
      attr: { title: 'Lock preview (edits will not refresh)' },
    });
    this.lockBtn.addEventListener('click', () => this.toggleLock());

    const prevBtn = navGroup.createEl('button', {
      cls: 'smart-red-tool-btn',
      text: '‹',
      attr: { title: 'Previous page' },
    });
    prevBtn.addEventListener('click', () => this.prevPage());

    this.navIndicator = navGroup.createEl('span', {
      cls: 'smart-red-page-indicator',
      text: '0/0',
    });

    const nextBtn = navGroup.createEl('button', {
      cls: 'smart-red-tool-btn',
      text: '›',
      attr: { title: 'Next page' },
    });
    nextBtn.addEventListener('click', () => this.nextPage());

    const templateGroup = navRow.createEl('div', { cls: 'smart-red-toolbar-group smart-red-template-group' });
    this.templateSelect = templateGroup.createEl('select', {
      cls: 'smart-red-template-select',
      attr: { title: 'Card template' },
    }) as HTMLSelectElement;
    for (const template of templates) {
      const option = document.createElement('option');
      option.value = template.name;
      option.textContent = template.displayName;
      this.templateSelect.appendChild(option);
    }
    this.templateSelect.value = this.pluginSettings.template;
    this.templateSelect.addEventListener('change', () => this.changeTemplate(this.templateSelect!.value));

    const typographyGroup = toolRow.createEl('div', { cls: 'smart-red-toolbar-group smart-red-typography-group' });
    const fontDownBtn = typographyGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-font-step-btn',
      text: 'A-',
      attr: { title: 'Decrease font size' },
    });
    fontDownBtn.addEventListener('click', () => this.changeFontSize(-1));

    this.fontSizeLabel = typographyGroup.createEl('span', {
      cls: 'smart-red-font-size-label',
      text: `${this.pluginSettings.fontSize}px`,
    });

    const fontUpBtn = typographyGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-font-step-btn',
      text: 'A+',
      attr: { title: 'Increase font size' },
    });
    fontUpBtn.addEventListener('click', () => this.changeFontSize(1));

    const chromeDownBtn = typographyGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-chrome-step-btn',
      text: 'H-',
      attr: { title: 'Decrease header and footer size' },
    });
    chromeDownBtn.addEventListener('click', () => this.changeChromeFontSize(-1));

    this.chromeSizeLabel = typographyGroup.createEl('span', {
      cls: 'smart-red-chrome-size-label',
      text: `${this.pluginSettings.chromeFontSize}px`,
    });

    const chromeUpBtn = typographyGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-chrome-step-btn',
      text: 'H+',
      attr: { title: 'Increase header and footer size' },
    });
    chromeUpBtn.addEventListener('click', () => this.changeChromeFontSize(1));

    this.fontFamilySelect = typographyGroup.createEl('select', {
      cls: 'smart-red-font-select',
      attr: { title: 'Card font' },
    }) as HTMLSelectElement;
    for (const font of FONT_OPTIONS) {
      const option = document.createElement('option');
      option.value = font.value;
      option.textContent = font.label;
      this.fontFamilySelect.appendChild(option);
    }
    this.fontFamilySelect.addEventListener('change', () => this.changeFontFamily(this.fontFamilySelect!.value));
    this.updateTypographyControls();

    const exportGroup = toolRow.createEl('div', { cls: 'smart-red-toolbar-group smart-red-export-group' });
    this.copyBtn = exportGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-export-btn',
      text: 'Copy',
      attr: { title: 'Copy current page as PNG' },
    });
    this.copyBtn.addEventListener('click', () => this.copyCurrentPage());

    this.pngBtn = exportGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-export-btn',
      text: 'PNG',
      attr: { title: 'Export current page as PNG' },
    });
    this.pngBtn.addEventListener('click', () => this.exportCurrentPage());

    this.zipBtn = exportGroup.createEl('button', {
      cls: 'smart-red-tool-btn smart-red-export-btn',
      text: 'ZIP',
      attr: { title: 'Export all pages as ZIP' },
    });
    this.zipBtn.addEventListener('click', () => this.exportAllPages());

    this.previewContainer = container.createEl('div', {
      cls: 'smart-red-preview-container',
    });
    this.observePreviewResize();

    this.emptyStateEl = this.previewContainer.createEl('div', {
      cls: 'smart-red-empty',
      text: 'Open a markdown note to preview',
    });

    const vaultModifyRef = (file: TFile) => {
      if (this.isLocked) return;
      let activeFile = this.app.workspace.getActiveFile();
      if (!activeFile || !(activeFile instanceof TFile) || activeFile.extension !== 'md') {
        const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
        if (markdownLeaves.length > 0) {
          const markdownView = markdownLeaves[0].view as any;
          if (markdownView.file) {
            activeFile = markdownView.file;
          }
        }
      }
      if (activeFile && file.path === activeFile.path) {
        this.debouncedRefresh();
      }
    };
    this.registerEvent(this.app.vault.on('modify', vaultModifyRef));

    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      if (this.isLocked) return;
      this.updateCurrentFile();
    }));

    this.registerEvent(this.app.workspace.on('file-open', (file: TFile) => {
      if (this.isLocked) return;
      if (file && file.extension === 'md') {
        this.refreshPreview();
      }
    }));

    this.updateCurrentFile();
  }

  async onClose(): Promise<void> {
    if (this.pendingRaf !== null) {
      cancelAnimationFrame(this.pendingRaf);
      this.pendingRaf = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  setSettings(settings: SmartRedSettings): void {
    this.pluginSettings = this.normalizeSettings(settings);
    this.exporter = new ExportPipeline({ pixelRatio: this.pluginSettings.exportPixelRatio });
    if (this.templateSelect) {
      this.templateSelect.value = this.pluginSettings.template;
    }
    this.updateTypographyControls();
    this.lastRenderKey = null;
    if (!this.isLocked) {
      this.refreshPreview();
    }
  }

  refreshNow(): void {
    if (!this.isLocked) {
      this.refreshPreview();
    }
  }

  private normalizeSettings(settings: SmartRedSettings): SmartRedSettings {
    return {
      ...settings,
      template: getTemplate(settings.template).name as SmartRedSettings['template'],
      fontSize: this.clampFontSize(settings.fontSize),
      chromeFontSize: this.clampChromeFontSize(settings.chromeFontSize),
    };
  }

  private getRenderContext(): TemplateRenderContext {
    return {
      fontSize: this.pluginSettings.fontSize,
      chromeFontSize: this.pluginSettings.chromeFontSize,
      user: { ...this.pluginSettings.user, avatar: this.resolvedAvatar },
      theme: this.pluginSettings.theme,
      sectionTitle: this.documentTitle,
      topSafeArea: this.pluginSettings.topSafeArea,
    };
  }

  private clampFontSize(fontSize: number): number {
    if (!Number.isFinite(fontSize)) return 31;
    return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(fontSize)));
  }

  private clampChromeFontSize(fontSize: number): number {
    if (!Number.isFinite(fontSize)) return 22;
    return Math.min(MAX_CHROME_FONT_SIZE, Math.max(MIN_CHROME_FONT_SIZE, Math.round(fontSize)));
  }

  private updateTypographyControls(): void {
    if (this.fontSizeLabel) {
      this.fontSizeLabel.textContent = `${this.pluginSettings.fontSize}px`;
    }
    if (this.chromeSizeLabel) {
      this.chromeSizeLabel.textContent = `${this.pluginSettings.chromeFontSize}px`;
    }
    if (this.fontFamilySelect) {
      this.fontFamilySelect.value = this.pluginSettings.theme.fontFamily || '';
      this.updateFontAvailability();
    }
  }

  private updateFontAvailability(): void {
    if (!this.fontFamilySelect) return;
    const selected = FONT_OPTIONS.find((font) => font.value === this.fontFamilySelect!.value);
    const primary = selected?.primary || '';
    const fontApi = document.fonts as FontFaceSet | undefined;
    const available = !primary || !fontApi?.check || fontApi.check(`16px "${primary}"`);
    this.fontFamilySelect.toggleClass('is-fallback', !available);
    this.fontFamilySelect.setAttribute(
      'title',
      available ? 'Card font' : `${selected?.label || 'Selected font'} not installed, fallback is used`
    );
  }

  private async persistSettings(): Promise<void> {
    if (this.onSettingsChange) {
      await this.onSettingsChange(this.pluginSettings);
    }
  }

  private async changeFontSize(delta: number): Promise<void> {
    const fontSize = this.clampFontSize(this.pluginSettings.fontSize + delta);
    if (fontSize === this.pluginSettings.fontSize) return;
    this.pluginSettings = {
      ...this.pluginSettings,
      fontSize,
    };
    this.lastRenderKey = null;
    this.updateTypographyControls();
    await this.persistSettings();
    this.refreshPreview();
  }

  private async changeChromeFontSize(delta: number): Promise<void> {
    const chromeFontSize = this.clampChromeFontSize(this.pluginSettings.chromeFontSize + delta);
    if (chromeFontSize === this.pluginSettings.chromeFontSize) return;
    this.pluginSettings = {
      ...this.pluginSettings,
      chromeFontSize,
    };
    this.lastRenderKey = null;
    this.updateTypographyControls();
    await this.persistSettings();
    this.refreshPreview();
  }

  private async changeFontFamily(fontFamily: string): Promise<void> {
    this.pluginSettings = {
      ...this.pluginSettings,
      theme: {
        ...this.pluginSettings.theme,
        fontFamily,
      },
    };
    this.lastRenderKey = null;
    this.updateTypographyControls();
    await this.persistSettings();
    this.refreshPreview();
  }

  private toggleLock(): void {
    this.isLocked = !this.isLocked;
    if (this.lockBtn) {
      this.lockBtn.textContent = this.isLocked ? 'Locked' : 'Lock';
      this.lockBtn.toggleClass('is-active', this.isLocked);
      this.lockBtn.setAttribute(
        'title',
        this.isLocked ? 'Preview locked' : 'Lock preview (edits will not refresh)'
      );
    }
  }

  private async changeTemplate(template: string): Promise<void> {
    this.pluginSettings = {
      ...this.pluginSettings,
      template: getTemplate(template).name as SmartRedSettings['template'],
    };
    this.lastRenderKey = null;
    if (this.templateSelect) {
      this.templateSelect.value = this.pluginSettings.template;
    }
    await this.persistSettings();
    if (!this.isLocked) {
      this.refreshPreview();
    }
  }

  private updateCurrentFile(): void {
    // 优先取活动文件，如果当前活动的是 Smart RED 视图本身，就从左侧编辑器取
    let activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || !(activeFile instanceof TFile) || activeFile.extension !== 'md') {
      // 尝试从左侧编辑器获取文件
      const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
      if (markdownLeaves.length > 0) {
        const markdownView = markdownLeaves[0].view as any;
        if (markdownView.file) {
          activeFile = markdownView.file;
        }
      }
    }
    if (activeFile && activeFile instanceof TFile && activeFile.extension === 'md') {
      this.refreshPreview();
    } else {
      this.showEmptyState('Open a markdown note to preview');
    }
  }

  private prevPage(): void {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
      this.renderCurrentPage();
    }
  }

  private nextPage(): void {
    if (this.currentPageIndex < this.decisions.length - 1) {
      this.currentPageIndex++;
      this.renderCurrentPage();
    }
  }

  private refreshPreview(): void {
    if (this.pendingRaf !== null) {
      cancelAnimationFrame(this.pendingRaf);
    }
    this.pendingRaf = requestAnimationFrame(() => {
      this.pendingRaf = null;
      this.doRefresh();
    });
  }

  private async doRefresh(): Promise<void> {
    const seq = ++this.renderSeq;
    let activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || !(activeFile instanceof TFile) || activeFile.extension !== 'md') {
      const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
      if (markdownLeaves.length > 0) {
        const markdownView = markdownLeaves[0].view as any;
        if (markdownView.file) {
          activeFile = markdownView.file;
        }
      }
    }
    if (!activeFile || !(activeFile instanceof TFile) || activeFile.extension !== 'md') {
      this.showEmptyState('Open a markdown note to preview');
      return;
    }

    if (!this.previewContainer) return;

    try {
      const content = await this.app.vault.read(activeFile);
      if (seq !== this.renderSeq) return;
      if (!content.trim()) {
        this.showEmptyState('Note is empty');
        return;
      }

      const template = getTemplate(this.pluginSettings.template);
      const renderKey = `${activeFile.path}\0${template.name}\0${JSON.stringify(this.pluginSettings)}\0${content}`;
      if (renderKey === this.lastRenderKey) return;

      await this.waitForFonts();
      this.resolvedAvatar = await this.resolveAvatar(activeFile);
      if (seq !== this.renderSeq) return;
      const blocks = await this.prepareBlocksForRender(this.parser.parse(content), activeFile);
      if (blocks.length === 0) {
        this.showEmptyState('No renderable content found');
        return;
      }
      this.documentTitle = this.extractDocumentTitle(blocks, activeFile);

      const segments = buildRenderSegments(blocks);
      this.decisions = [];
      const availableHeight = this.getAvailableContentHeight(template.cardPadding);
      const measurer = this.createPageMeasurer();
      try {
        for (const segment of segments) {
          const prepared = segment.map((block, index) =>
            this.withStableBlockMetadata(block, index)
          );
          const segmentDecisions = paginateMeasured(prepared, {
            availableHeight,
            measure: measurer.measure,
            breakWidthFor: (block) => this.getParagraphBreakWidth(block),
          });
          for (const decision of segmentDecisions) {
            this.decisions.push({
              ...decision,
              pageIndex: this.decisions.length,
            });
          }
        }
      } finally {
        measurer.dispose();
      }
      this.currentPageIndex = Math.min(
        this.currentPageIndex,
        Math.max(0, this.decisions.length - 1)
      );
      if (seq !== this.renderSeq) return;

      this.lastRenderKey = renderKey;
      this.renderCurrentPage();
    } catch (err) {
      console.error('Smart RED: preview render failed', err);
      this.showEmptyState('Error rendering preview');
    }
  }

  private async waitForFonts(): Promise<void> {
    const fontApi = document.fonts as FontFaceSet | undefined;
    if (fontApi?.ready) {
      await fontApi.ready;
    }
  }

  private async resolveAvatar(activeFile: TFile): Promise<string> {
    const raw = (this.pluginSettings.user.avatar || '').trim();
    if (!raw) return '';
    const resolved = this.resolveImageSource(raw, activeFile);
    const dims = await this.loadImageDimensions(resolved);
    return dims ? resolved : '';
  }

  private getAvailableContentHeight(cardPadding: number): number {
    const user = { ...this.pluginSettings.user, avatar: this.resolvedAvatar };
    const topSafe = Math.max(0, this.pluginSettings.topSafeArea ?? 0);
    const topPadding =
      cardPadding + topSafe + computeHeaderReserve(user, this.pluginSettings.chromeFontSize);
    const bottomPadding = cardPadding + footerReservePx(user.showFooter !== false);
    return Math.max(0, CARD_HEIGHT - topPadding - bottomPadding - PAGE_SAFETY_PX);
  }

  private async prepareBlocksForRender(
    blocks: SemanticBlock[],
    activeFile: TFile
  ): Promise<SemanticBlock[]> {
    const prepared = await Promise.all(
      blocks.map(async (block) => {
        if (block.type !== BlockType.Image) return block;
        return this.prepareImageBlock(block, activeFile);
      })
    );
    return prepared.filter((block): block is SemanticBlock => block !== null);
  }

  private async prepareImageBlock(
    block: SemanticBlock,
    activeFile: TFile
  ): Promise<SemanticBlock | null> {
    const resolvedSrc = this.resolveImageSource(block.content, activeFile);
    const dimensions = await this.loadImageDimensions(resolvedSrc);
    if (!dimensions) return null;

    return {
      ...block,
      content: resolvedSrc,
      metadata: {
        ...block.metadata,
        naturalWidth: dimensions.width,
        naturalHeight: dimensions.height,
      },
    };
  }

  private resolveImageSource(src: string, activeFile: TFile): string {
    const raw = src.trim();
    if (/^(https?:|data:|blob:|file:|app:)/i.test(raw)) return raw;

    const fileUrl = absolutePathToFileUrl(raw);
    if (fileUrl) return fileUrl;

    const app = this.app as any;
    const vault = app?.vault;

    // Obsidian's own wiki-link resolution finds attachments in any folder.
    const linkDest = app?.metadataCache?.getFirstLinkpathDest?.(
      decodeURIComponent(raw.replace(/\\/g, '/')),
      activeFile.path
    );
    if (linkDest && vault?.getResourcePath) {
      return vault.getResourcePath(linkDest);
    }

    const baseDir = activeFile.path.includes('/')
      ? activeFile.path.slice(0, activeFile.path.lastIndexOf('/'))
      : '';
    const normalizedRaw = raw.replace(/\\/g, '/').replace(/^\.\/+/, '');
    const candidates = [
      normalizedRaw,
      decodeURIComponent(normalizedRaw),
      baseDir ? `${baseDir}/${normalizedRaw}` : normalizedRaw,
      baseDir ? `${baseDir}/${decodeURIComponent(normalizedRaw)}` : decodeURIComponent(normalizedRaw),
    ];

    for (const candidate of candidates) {
      const file = vault?.getAbstractFileByPath?.(candidate);
      if (file && vault?.getResourcePath) {
        return vault.getResourcePath(file);
      }
    }

    return raw;
  }

  private async loadImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
    const ImageCtor = (window as typeof window & { Image?: typeof Image }).Image;
    if (!ImageCtor) return null;

    return new Promise((resolve) => {
      const img = new ImageCtor();
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, IMAGE_LOAD_TIMEOUT_MS);
      const cleanup = () => {
        window.clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        cleanup();
        resolve(width > 0 && height > 0 ? { width, height } : null);
      };
      img.onerror = () => {
        cleanup();
        resolve(null);
      };
      img.src = src;
    });
  }

  private extractDocumentTitle(blocks: SemanticBlock[], activeFile: TFile): string {
    const h1 = blocks.find(
      (block) => block.type === BlockType.Heading && block.metadata?.level === 1
    );
    if (h1?.content.trim()) {
      return stripInlineMarkdown(h1.content.trim()) || 'Smart RED';
    }
    return stripInlineMarkdown(activeFile.name.replace(/\.md$/i, '')) || 'Smart RED';
  }

  // Renders candidate pages into one reused offscreen root and reports their
  // real height; falls back to estimation when DOM measurement yields nothing
  // (e.g. detached or headless environments).
  private createPageMeasurer(): {
    measure: (blocks: SemanticBlock[]) => number;
    dispose: () => void;
  } {
    const template = getTemplate(this.pluginSettings.template);
    const fontSize = this.pluginSettings.fontSize || template.baseFontSize;
    const paragraphGap = this.pluginSettings.theme.spacing || 24;
    const lineHeightPx = fontSize * template.lineHeightRatio;
    const contentWidth = CARD_WIDTH - 2 * template.cardPadding;
    const cjkCharsPerLine = Math.max(8, Math.floor(contentWidth / (fontSize * 0.86)));

    let root: HTMLElement | null = null;

    const estimate = (blocks: SemanticBlock[]): number =>
      blocks.reduce(
        (sum, block) =>
          sum +
          this.estimateBlockMeasurement(
            block,
            fontSize,
            paragraphGap,
            lineHeightPx,
            contentWidth,
            cjkCharsPerLine
          ).height,
        0
      );

    const measure = (blocks: SemanticBlock[]): number => {
      if (blocks.length === 0) return 0;
      const normalized = normalizeParagraphFragments(blocks);
      if (!root) {
        root = this.createMeasurementRoot(template.backgroundColor);
      }
      const page: PaginationDecision = {
        pageIndex: 0,
        blocks: normalized,
        hasContinuation: false,
      };
      this.renderer.renderExportCard(root, normalized, page, template, this.getRenderContext());
      const card = root.querySelector(`.${template.cardClassName}`) as HTMLElement | null;
      const flow = root.querySelector('.article-flow') as HTMLElement | null;
      if (!card || !flow) return estimate(normalized);

      root.setCssStyles({ height: 'auto' });
      card.setCssStyles({ height: 'auto', minHeight: '0', overflow: 'visible' });
      for (const chrome of Array.from(card.querySelectorAll('.card-chrome')) as HTMLElement[]) {
        chrome.setCssStyles({ display: 'none' });
      }
      flow.setCssStyles({ height: 'auto', overflow: 'visible' });

      const measured = this.measureElementHeight(flow, false);
      return measured > 0 ? measured : estimate(normalized);
    };

    return {
      measure,
      dispose: () => {
        root?.remove();
        root = null;
      },
    };
  }

  private getParagraphBreakWidth(block: SemanticBlock): number {
    const splitWidthUnits = block.metadata?.splitWidthUnits;
    if (typeof splitWidthUnits === 'number' && splitWidthUnits > 0) {
      return Math.floor(splitWidthUnits);
    }

    const template = getTemplate(this.pluginSettings.template);
    const fontSize = this.pluginSettings.fontSize || template.baseFontSize;
    const contentWidth = CARD_WIDTH - 2 * template.cardPadding;
    // One CJK char is 1em wide (2 width units); no widening fudge so estimated
    // lines track rendered lines and splits can fill the page bottom tightly.
    return Math.max(16, Math.floor(contentWidth / fontSize) * 2);
  }

  private withStableBlockMetadata(block: SemanticBlock, index: number): SemanticBlock {
    const template = getTemplate(this.pluginSettings.template);
    const fontSize = this.pluginSettings.fontSize || template.baseFontSize;
    const contentWidth = CARD_WIDTH - 2 * template.cardPadding;
    const splitCharsPerLine = Math.max(8, Math.floor(contentWidth / fontSize));
    const metadata = {
      ...block.metadata,
      splitWidthUnits: splitCharsPerLine * 2,
      splitCharsPerLine,
    };

    if (block.type !== BlockType.Paragraph) {
      return { ...block, metadata };
    }

    const sourceBlockId = typeof block.metadata?.sourceBlockId === 'string'
      ? block.metadata.sourceBlockId
      : `paragraph-${index}`;
    const fragmentStart = typeof block.metadata?.fragmentStart === 'number'
      ? block.metadata.fragmentStart
      : 0;
    const fragmentEnd = typeof block.metadata?.fragmentEnd === 'number'
      ? block.metadata.fragmentEnd
      : block.content.length;

    return {
      ...block,
      metadata: {
        ...metadata,
        sourceBlockId,
        fragmentStart,
        fragmentEnd,
      },
    };
  }

  private estimateBlockMeasurement(
    block: SemanticBlock,
    fontSize: number,
    paragraphGap: number,
    lineHeightPx: number,
    contentWidth: number,
    charsPerLine: number
  ): { height: number; lines: number } {
      const lines = this.estimateLines(block.content, charsPerLine);
      let height = Math.ceil(lines * lineHeightPx + paragraphGap);
      let measuredLines = lines;

      switch (block.type) {
        case BlockType.Heading: {
          const level = typeof block.metadata?.level === 'number' ? block.metadata.level : 2;
          const headingScale = level <= 1 ? 1.78 : level === 2 ? 1.48 : 1.24;
          const headingLineHeight = fontSize * headingScale * (level <= 2 ? 1.14 : 1.22);
          const headingChars = Math.max(6, Math.floor(charsPerLine / headingScale));
          measuredLines = this.estimateLines(block.content, headingChars);
          height = Math.ceil(measuredLines * headingLineHeight + (level <= 2 ? 24 : 18));
          break;
        }
        case BlockType.CodeBlock: {
          measuredLines = Math.max(1, block.content.split('\n').length);
          height = Math.ceil(measuredLines * fontSize * 0.84 * 1.55 + 58);
          break;
        }
        case BlockType.Image: {
          measuredLines = 1;
          height = this.measureImageBlockHeight(block, contentWidth);
          break;
        }
        case BlockType.Table: {
          measuredLines = Math.max(2, block.content.split('\n').filter((line) => line.trim()).length);
          height = Math.ceil(measuredLines * (fontSize * 1.42 + 28) + 30);
          break;
        }
        case BlockType.List: {
          const items = block.content.split('\n').filter((line) => line.trim()).length || 1;
          measuredLines = Math.max(items, lines);
          height = Math.ceil(measuredLines * lineHeightPx + items * 14 + paragraphGap);
          break;
        }
        case BlockType.Blockquote:
          height = Math.ceil(lines * fontSize * 1.42 + 78);
          break;
        case BlockType.HorizontalRule:
          measuredLines = 1;
          height = 70;
          break;
        case BlockType.Spacer: {
          const gaps = typeof block.metadata?.gaps === 'number' ? Math.max(1, block.metadata.gaps) : 1;
          measuredLines = 1;
          height = Math.ceil(gaps * paragraphGap);
          break;
        }
      }

      return { height, lines: measuredLines };
  }

  private measureImageBlockHeight(block: SemanticBlock, contentWidth: number): number {
    const naturalWidth = typeof block.metadata?.naturalWidth === 'number'
      ? block.metadata.naturalWidth
      : 0;
    const naturalHeight = typeof block.metadata?.naturalHeight === 'number'
      ? block.metadata.naturalHeight
      : 0;
    const imageHeight = naturalWidth > 0 && naturalHeight > 0
      ? Math.min(IMAGE_MAX_HEIGHT, Math.round((contentWidth / naturalWidth) * naturalHeight))
      : IMAGE_MAX_HEIGHT;
    const captionReserve = block.metadata?.alt ? 38 : 0;
    return imageHeight + 54 + captionReserve;
  }

  private createMeasurementRoot(templateBackgroundColor: string): HTMLElement {
    const root = document.createElement('div');
    root.className = 'smart-red-offscreen-root smart-red-measurement-root';
    root.setCssStyles({
      width: `${CARD_WIDTH}px`,
      height: 'auto',
      backgroundColor: this.pluginSettings.theme.backgroundColor || templateBackgroundColor,
    });
    document.body.appendChild(root);
    return root;
  }

  private measureElementHeight(el: HTMLElement, includeTrailingMargin = true): number {
    const rectHeight = el.getBoundingClientRect().height;
    const scrollHeight = el.scrollHeight;
    const children = Array.from(el.children) as HTMLElement[];
    const childHeight = children.reduce((sum, childEl, index) => {
      const styles = getComputedStyle(childEl);
      const marginTop = parseFloat(styles.marginTop || '0') || 0;
      const marginBottom = parseFloat(styles.marginBottom || '0') || 0;
      const previous = index > 0 ? children[index - 1] : null;
      const previousMarginBottom = previous
        ? parseFloat(getComputedStyle(previous).marginBottom || '0') || 0
        : 0;
      const collapsedGap = index === 0
        ? marginTop
        : this.collapseVerticalMargins(previousMarginBottom, marginTop);
      const tailMargin = includeTrailingMargin && index === children.length - 1
        ? marginBottom
        : 0;
      return sum + childEl.getBoundingClientRect().height + collapsedGap + tailMargin;
    }, 0);
    if (children.length > 0 && childHeight > 0) {
      return childHeight;
    }
    return Math.max(rectHeight, scrollHeight, childHeight);
  }

  private collapseVerticalMargins(previousBottom: number, currentTop: number): number {
    if (previousBottom >= 0 && currentTop >= 0) {
      return Math.max(previousBottom, currentTop);
    }
    if (previousBottom <= 0 && currentTop <= 0) {
      return Math.min(previousBottom, currentTop);
    }
    return previousBottom + currentTop;
  }

  private estimateLines(content: string, charsPerLine: number): number {
    const lines = content.split('\n');
    return Math.max(
      1,
      lines.reduce((sum, line) => {
        const length = Math.max(1, line.trim().length);
        return sum + Math.max(1, Math.ceil(length / charsPerLine));
      }, 0)
    );
  }

  private renderCurrentPage(): void {
    if (!this.previewContainer) return;

    if (this.emptyStateEl && this.emptyStateEl.parentNode === this.previewContainer) {
      this.previewContainer.removeChild(this.emptyStateEl);
    }

    this.previewContainer.empty();
    this.currentPageEl = null;

    if (this.decisions.length === 0) {
      this.emptyStateEl = this.previewContainer.createEl('div', {
        cls: 'smart-red-empty',
        text: 'No content to preview',
      });
      this.updateNavIndicator();
      return;
    }

    const decision = this.decisions[this.currentPageIndex];
    const template = getTemplate(this.pluginSettings.template);
    const pageBlocks = normalizeParagraphFragments(decision.blocks);

    const wrapper = this.previewContainer.createEl('div', {
      cls: 'smart-red-card-wrapper',
    });
    this.currentPageEl = wrapper;

    this.renderer.renderCard(wrapper, pageBlocks, decision, template, this.getRenderContext());
    this.updatePreviewScale();
    this.updateNavIndicator();
  }

  private observePreviewResize(): void {
    if (!this.previewContainer) return;
    const ResizeObserverCtor = (window as typeof window & {
      ResizeObserver?: typeof ResizeObserver;
    }).ResizeObserver;
    if (!ResizeObserverCtor) return;

    this.resizeObserver = new ResizeObserverCtor(() => this.updatePreviewScale());
    this.resizeObserver.observe(this.previewContainer);
  }

  private updatePreviewScale(): void {
    if (!this.previewContainer || !this.currentPageEl) return;

    const rect = this.previewContainer.getBoundingClientRect();
    const width = this.previewContainer.clientWidth || rect.width;
    const height = this.previewContainer.clientHeight || rect.height;
    if (!width || !height) return;

    const availableWidth = Math.max(240, width - 36);
    const availableHeight = Math.max(320, height - 36);
    const scale = Math.min(
      1,
      Math.max(0.18, Math.min(availableWidth / CARD_WIDTH, availableHeight / CARD_HEIGHT))
    );
    this.currentPageEl.style.setProperty('--smart-red-scale', scale.toFixed(4));
  }

  private createExportContainer(
    decision: PaginationDecision,
    template = getTemplate(this.pluginSettings.template)
  ): HTMLElement {
    const exportRoot = this.createExportRoot('smart-red-export-root', template.backgroundColor);

    const pageBlocks = normalizeParagraphFragments(decision.blocks);
    this.renderer.renderExportCard(exportRoot, pageBlocks, decision, template, this.getRenderContext());
    return exportRoot;
  }

  private createExportRoot(className: string, templateBackgroundColor: string): HTMLElement {
    const exportRoot = document.createElement('div');
    exportRoot.className = `smart-red-offscreen-root ${className}`;
    exportRoot.setCssStyles({
      width: `${CARD_WIDTH}px`,
      minHeight: `${CARD_HEIGHT}px`,
      backgroundColor: this.pluginSettings.theme.backgroundColor || templateBackgroundColor,
    });
    document.body.appendChild(exportRoot);
    return exportRoot;
  }

  private async withButtonState(
    button: HTMLButtonElement | null,
    loadingText: string,
    task: () => Promise<void>
  ): Promise<void> {
    const originalText = button?.textContent ?? '';
    if (button) {
      button.disabled = true;
      button.textContent = loadingText;
      button.addClass('is-loading');
    }
    try {
      await task();
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
        button.removeClass('is-loading');
      }
    }
  }

  private async copyCurrentPage(): Promise<void> {
    await this.withButtonState(this.copyBtn, 'Copying', async () => {
      if (this.decisions.length === 0) {
        new Notice('No Smart RED page to copy');
        return;
      }

      const template = getTemplate(this.pluginSettings.template);
      const decision = this.decisions[this.currentPageIndex];
      const exportRoot = this.createExportContainer(decision, template);

      try {
        const blob = await this.exporter.renderToBlob(exportRoot, this.currentPageIndex);
        await copyPngBlobToClipboard(blob);
        new Notice('Smart RED image copied');
      } catch (err) {
        console.error('Smart RED: copy failed', err);
        new Notice('Copy failed. PNG export is still available.');
      } finally {
        exportRoot.remove();
      }
    });
  }

  private async exportCurrentPage(): Promise<void> {
    await this.withButtonState(this.pngBtn, 'Exporting', async () => {
      if (this.decisions.length === 0) {
        new Notice('No Smart RED page to export');
        return;
      }

      const template = getTemplate(this.pluginSettings.template);
      const decision = this.decisions[this.currentPageIndex];
      const exportRoot = this.createExportContainer(decision, template);

      try {
        const blob = await this.exporter.renderToBlob(exportRoot, this.currentPageIndex);
        this.downloadBlob(blob, pageFileName(this.currentPageIndex, this.documentTitle));
        new Notice('Smart RED PNG exported');
      } catch (err) {
        console.error('Smart RED: export failed', err);
        new Notice('Smart RED export failed');
      } finally {
        exportRoot.remove();
      }
    });
  }

  private async exportAllPages(): Promise<void> {
    await this.withButtonState(this.zipBtn, 'Exporting', async () => {
      if (this.decisions.length === 0) {
        new Notice('No Smart RED pages to export');
        return;
      }

      const template = getTemplate(this.pluginSettings.template);
      const exportRoot = this.createExportRoot('smart-red-export-batch', template.backgroundColor);

      try {
        const containers: HTMLElement[] = [];
        for (const decision of this.decisions) {
          const wrapper = document.createElement('div');
          wrapper.className = 'smart-red-export-card';
          wrapper.setCssStyles({
            backgroundColor: this.pluginSettings.theme.backgroundColor || template.backgroundColor,
          });
          exportRoot.appendChild(wrapper);
          const pageBlocks = normalizeParagraphFragments(decision.blocks);
          this.renderer.renderExportCard(wrapper, pageBlocks, decision, template, this.getRenderContext());
          containers.push(wrapper);
        }

        const blob = await this.exporter.exportAllPages(containers, this.documentTitle);
        this.downloadBlob(blob, `${sanitizeFileName(this.documentTitle)}.zip`);
        new Notice('Smart RED ZIP exported');
      } catch (err) {
        console.error('Smart RED: export failed', err);
        new Notice('Smart RED export failed');
      } finally {
        exportRoot.remove();
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private updateNavIndicator(): void {
    if (this.navIndicator) {
      const total = this.decisions.length;
      const current = total > 0 ? this.currentPageIndex + 1 : 0;
      this.navIndicator.textContent = `${current}/${total}`;
    }
  }

  private showEmptyState(message: string): void {
    this.decisions = [];
    this.currentPageIndex = 0;
    this.currentPageEl = null;
    if (this.previewContainer) {
      this.previewContainer.empty();
      this.emptyStateEl = this.previewContainer.createEl('div', {
        cls: 'smart-red-empty',
        text: message,
      });
    }
    this.updateNavIndicator();
  }
}
