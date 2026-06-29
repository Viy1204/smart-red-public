import './dom-setup';
import { describe, test, expect, beforeEach } from 'bun:test';
import { RedView, VIEW_TYPE_SMART_RED } from '../view';
import { DEFAULT_SETTINGS } from '../settings';
import { WorkspaceLeaf, App, TFile } from './obsidian-mock';
import { BlockType } from '../types';

function makeAppWithFile(content: string) {
  const app = new App();
  const file = new TFile('test.md', 'test.md', 'md');
  app.workspace.getActiveFile = () => file;
  app.vault.read = async () => content;
  return app;
}

describe('RedView', () => {
  let view: RedView;
  let app: App;
  const originalImage = (window as any).Image;
  const originalFonts = (document as any).fonts;

  beforeEach(() => {
    (window as any).Image = originalImage;
    (document as any).fonts = originalFonts;
    app = makeAppWithFile('# Hello\n\nThis is a test note with some content.');
    const leaf = new WorkspaceLeaf(app);
    view = new RedView(leaf as any, DEFAULT_SETTINGS);
    (view as any).app = app;
  });

  test('has correct view type', () => {
    expect(view.getViewType()).toBe(VIEW_TYPE_SMART_RED);
    expect(view.getDisplayText()).toBe('Smart RED Preview');
    expect(view.getIcon()).toBe('image');
  });

  test('setSettings updates template preference', () => {
    view.setSettings({ ...DEFAULT_SETTINGS, template: 'noir-magazine' });
    expect((view as any).pluginSettings.template).toBe('noir-magazine');
  });

  test('toolbar template select updates settings', async () => {
    let savedTemplate = '';
    const leaf = new WorkspaceLeaf(app);
    view = new RedView(leaf as any, DEFAULT_SETTINGS, async (settings) => {
      savedTemplate = settings.template;
    });
    (view as any).app = app;

    await view.onOpen();
    const select = (view as any).templateSelect as HTMLSelectElement;
    select.value = 'warm-zine';
    select.dispatchEvent(new (select.ownerDocument.defaultView as any).Event('change'));

    expect((view as any).pluginSettings.template).toBe('warm-zine');
    expect(savedTemplate).toBe('warm-zine');
  });

  test('toolbar includes copy button before PNG export', async () => {
    await view.onOpen();
    const buttons = Array.from(
      view.containerEl.querySelectorAll('.smart-red-export-btn')
    ).map((button) => button.textContent);

    expect(buttons).toEqual(['Copy', 'PNG', 'ZIP']);
  });

  test('toolbar separates navigation from scrollable tools', async () => {
    await view.onOpen();
    const navRow = view.containerEl.querySelector('.smart-red-toolbar-row-primary');
    const toolRow = view.containerEl.querySelector('.smart-red-toolbar-row-secondary');

    expect(navRow).not.toBeNull();
    expect(toolRow).not.toBeNull();
    expect(navRow?.querySelector('.smart-red-page-indicator')).not.toBeNull();
    expect(toolRow?.querySelector('.smart-red-font-select')).not.toBeNull();
    expect(toolRow?.querySelector('.smart-red-export-btn')).not.toBeNull();
  });

  test('toolbar font controls update typography settings', async () => {
    let savedSettings = DEFAULT_SETTINGS;
    const leaf = new WorkspaceLeaf(app);
    view = new RedView(leaf as any, DEFAULT_SETTINGS, async (settings) => {
      savedSettings = settings;
    });
    (view as any).app = app;

    await view.onOpen();
    const fontButtons = Array.from(
      view.containerEl.querySelectorAll('.smart-red-font-step-btn')
    ) as HTMLButtonElement[];
    const increase = fontButtons[1];
    increase.click();
    await new Promise((r) => setTimeout(r, 0));

    expect((view as any).pluginSettings.fontSize).toBe(DEFAULT_SETTINGS.fontSize + 1);
    expect(savedSettings.fontSize).toBe(DEFAULT_SETTINGS.fontSize + 1);
    expect(view.containerEl.querySelector('.smart-red-font-size-label')?.textContent).toBe('32px');

    const chromeButtons = Array.from(
      view.containerEl.querySelectorAll('.smart-red-chrome-step-btn')
    ) as HTMLButtonElement[];
    const chromeIncrease = chromeButtons[1];
    chromeIncrease.click();
    await new Promise((r) => setTimeout(r, 0));

    expect((view as any).pluginSettings.chromeFontSize).toBe(DEFAULT_SETTINGS.chromeFontSize + 1);
    expect(savedSettings.chromeFontSize).toBe(DEFAULT_SETTINGS.chromeFontSize + 1);
    expect(view.containerEl.querySelector('.smart-red-chrome-size-label')?.textContent).toBe('23px');

    const select = view.containerEl.querySelector('.smart-red-font-select') as HTMLSelectElement;
    expect(select.options.length).toBeGreaterThanOrEqual(9);
    expect(Array.from(select.options).map((option) => option.textContent)).toContain('霞鹜文楷');

    select.value = select.options[1].value;
    select.dispatchEvent(new (select.ownerDocument.defaultView as any).Event('change'));
    await new Promise((r) => setTimeout(r, 0));

    expect((view as any).pluginSettings.theme.fontFamily).toBe(select.options[1].value);
    expect(savedSettings.theme.fontFamily).toBe(select.options[1].value);
  });

  test('extracts H1 as document title and falls back to file name', () => {
    const h1Title = (view as any).extractDocumentTitle(
      [
        { type: 'heading', content: '**真正的文章标题**', metadata: { level: 1 } },
        { type: 'paragraph', content: '正文' },
      ],
      new TFile('fallback.md', 'fallback.md', 'md')
    );
    const fallbackTitle = (view as any).extractDocumentTitle(
      [{ type: 'paragraph', content: '正文' }],
      new TFile('fallback.md', 'fallback.md', 'md')
    );

    expect(h1Title).toBe('真正的文章标题');
    expect(fallbackTitle).toBe('fallback');
  });

  test('waits for document fonts before measuring pages', async () => {
    let resolved = false;
    (document as any).fonts = {
      ready: new Promise<void>((resolve) => {
        setTimeout(() => {
          resolved = true;
          resolve();
        }, 0);
      }),
    };

    await (view as any).waitForFonts();

    expect(resolved).toBe(true);
  });

  test('skips broken images before pagination', async () => {
    class BrokenImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      width = 0;
      height = 0;
      set src(_value: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
    (window as any).Image = BrokenImage;

    const blocks = await (view as any).prepareBlocksForRender(
      [
        { type: BlockType.Paragraph, content: '前文' },
        { type: BlockType.Image, content: 'missing.png', metadata: { alt: '图片' } },
        { type: BlockType.Paragraph, content: '后文' },
      ],
      new TFile('folder/test.md', 'test.md', 'md')
    );

    expect(blocks.map((block: any) => block.type)).toEqual([
      BlockType.Paragraph,
      BlockType.Paragraph,
    ]);
  });

  test('keeps valid images with natural dimensions and resolved vault path', async () => {
    class LoadedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 1200;
      naturalHeight = 800;
      width = 1200;
      height = 800;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    (window as any).Image = LoadedImage;
    app.vault.getAbstractFileByPath = (path: string) => path === 'folder/image.png' ? { path } : null;
    app.vault.getResourcePath = (file: any) => `app://resource/${file.path}`;

    const blocks = await (view as any).prepareBlocksForRender(
      [{ type: BlockType.Image, content: './image.png', metadata: { alt: '图片' } }],
      new TFile('folder/test.md', 'test.md', 'md')
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('app://resource/folder/image.png');
    expect(blocks[0].metadata.naturalWidth).toBe(1200);
    expect(blocks[0].metadata.naturalHeight).toBe(800);
  });

  test('measures valid images from natural dimensions instead of fixed height', () => {
    const height = (view as any).measureImageBlockHeight(
      {
        type: BlockType.Image,
        content: 'ok.png',
        metadata: { naturalWidth: 1200, naturalHeight: 600 },
      },
      900
    );

    // 450 scaled height + 54 figure margins; no caption reserve without alt.
    expect(height).toBe(504);
  });

  test('available content height uses a tighter footer reserve', () => {
    const cardPadding = 78;
    const available = (view as any).getAvailableContentHeight(cardPadding);
    const oldConservativeAvailable = 1440 - (cardPadding + 36) - (cardPadding + 96) - 12;
    const withoutFooterAvailable = 1440 - (cardPadding + 36) - cardPadding;

    expect(available).toBeGreaterThan(oldConservativeAvailable);
    expect(available).toBeLessThan(withoutFooterAvailable);
  });

  test('page fit measurement can ignore the final block trailing margin', () => {
    const root = document.createElement('main');
    const first = document.createElement('p');
    const second = document.createElement('p');
    first.style.marginBottom = '20px';
    second.style.marginTop = '8px';
    second.style.marginBottom = '30px';
    (first as any).getBoundingClientRect = () => ({ height: 100 });
    (second as any).getBoundingClientRect = () => ({ height: 50 });
    root.appendChild(first);
    root.appendChild(second);
    document.body.appendChild(root);

    try {
      expect((view as any).measureElementHeight(root)).toBe(200);
      expect((view as any).measureElementHeight(root, false)).toBe(170);
    } finally {
      root.remove();
    }
  });

  test('page fit measurement handles negative collapsed margins', () => {
    const root = document.createElement('main');
    const first = document.createElement('p');
    const second = document.createElement('p');
    first.style.marginBottom = '24px';
    second.style.marginTop = '-24px';
    (first as any).getBoundingClientRect = () => ({ height: 100 });
    (second as any).getBoundingClientRect = () => ({ height: 50 });
    root.appendChild(first);
    root.appendChild(second);
    document.body.appendChild(root);

    try {
      expect((view as any).measureElementHeight(root, false)).toBe(150);
    } finally {
      root.remove();
    }
  });

  test('page fit measurement prefers measurable children over fixed flow height', () => {
    const root = document.createElement('main');
    const child = document.createElement('p');
    child.style.marginBottom = '24px';
    (root as any).getBoundingClientRect = () => ({ height: 1222 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 1222 });
    (child as any).getBoundingClientRect = () => ({ height: 120 });
    root.appendChild(child);
    document.body.appendChild(root);

    try {
      expect((view as any).measureElementHeight(root, false)).toBe(120);
      expect((view as any).measureElementHeight(root, true)).toBe(144);
    } finally {
      root.remove();
    }
  });

  test('toggleLock switches lock state', () => {
    expect((view as any).isLocked).toBe(false);
    (view as any).toggleLock();
    expect((view as any).isLocked).toBe(true);
    (view as any).toggleLock();
    expect((view as any).isLocked).toBe(false);
  });

  test('navigation updates page index', async () => {
    await view.onOpen();
    await new Promise((r) => setTimeout(r, 50));
    const decisions = (view as any).decisions;
    if (decisions.length > 1) {
      (view as any).nextPage();
      expect((view as any).currentPageIndex).toBe(1);
      (view as any).prevPage();
      expect((view as any).currentPageIndex).toBe(0);
    }
  });

  test('renders preview container on open', async () => {
    await view.onOpen();
    const container = (view as any).previewContainer;
    expect(container).not.toBeNull();
    expect(container.classList.contains('smart-red-preview-container')).toBe(true);
  });

  test('shows empty state for non-markdown file', async () => {
    app.workspace.getActiveFile = () => new TFile('test.txt', 'test.txt', 'txt');
    await view.onOpen();
    expect((view as any).decisions.length).toBe(0);
  });

  test('onOpen registers workspace and vault events', async () => {
    await view.onOpen();
    expect((view as any).registeredEvents.length).toBeGreaterThanOrEqual(3);
  });

  test('onClose cancels pending work and observers', async () => {
    await view.onOpen();
    await view.onClose();
    expect((view as any).pendingRaf).toBeNull();
    expect((view as any).resizeObserver).toBeNull();
  });
});
