import './dom-setup';
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { readFileSync } from 'node:fs';
import { toSvg } from 'html-to-image';
import { unzipSync } from 'fflate';
import { RedView } from '../view';
import { DEFAULT_SETTINGS } from '../settings';
import { WorkspaceLeaf } from './obsidian-mock';

const browserGlobals = [
  'Element', 'HTMLCanvasElement', 'HTMLVideoElement', 'HTMLIFrameElement',
  'HTMLTextAreaElement', 'HTMLInputElement', 'HTMLSelectElement',
  'HTMLImageElement', 'SVGImageElement', 'XMLSerializer',
];

class TestClipboardItem {
  constructor(public data: Record<string, Blob>) {}
}

describe('view exports', () => {
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
  let style: HTMLStyleElement;
  let view: RedView;
  let originalNavigator: PropertyDescriptor | undefined;
  let originalClipboardItem: unknown;
  let render: ReturnType<typeof spyOn>;
  let download: ReturnType<typeof spyOn>;
  let logError: ReturnType<typeof spyOn>;
  let clipboardWrite: ReturnType<typeof mock>;
  let bodyChildCount: number;
  let captures: { root: HTMLElement; blob: Blob }[];

  beforeAll(() => {
    for (const name of browserGlobals) {
      originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, { configurable: true, value: (window as any)[name] });
    }
    style = document.createElement('style');
    style.textContent = readFileSync(new URL('../../styles.css.base', import.meta.url), 'utf8');
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete (globalThis as any)[name];
    }
  });

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalClipboardItem = (window as any).ClipboardItem;
    clipboardWrite = mock(async () => {});
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { write: clipboardWrite } },
    });
    (window as any).ClipboardItem = TestClipboardItem;

    view = new RedView(new WorkspaceLeaf() as any, {
      ...DEFAULT_SETTINGS,
      template: 'notion',
      cover: { ...DEFAULT_SETTINGS.cover, enabled: false },
    });
    (view as any).documentTitle = '导出测试';
    (view as any).decisions = [{
      pageIndex: 0,
      blocks: [{ type: 'paragraph', content: '需要导出的正文内容。' }],
      hasContinuation: false,
    }];
    for (const [field, text] of [['copyBtn', 'Copy'], ['pngBtn', 'PNG'], ['zipBtn', 'ZIP']]) {
      const button = document.createElement('button');
      button.textContent = text;
      (view as any)[field] = button;
    }
    captures = [];
    bodyChildCount = document.body.children.length;
    // Exercise the real DOM-to-SVG capture; happy-dom cannot rasterize it to PNG.
    render = spyOn((view as any).exporter, 'renderToBlob').mockImplementation(async (element: HTMLElement) => {
      const svg = await toSvg(element, { width: 1080, height: 1440, skipFonts: true });
      const doc = new (window as any).DOMParser().parseFromString(
        decodeURIComponent(svg.split(',')[1]), 'text/html'
      );
      const root = doc.querySelector('foreignObject').firstElementChild as HTMLElement;
      const blob = new Blob([svg], { type: 'image/png' });
      captures.push({ root, blob });
      return blob;
    });
    download = spyOn(view as any, 'downloadBlob').mockImplementation(() => {});
    logError = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    render.mockRestore();
    download.mockRestore();
    logError.mockRestore();
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete (globalThis as any).navigator;
    (window as any).ClipboardItem = originalClipboardItem;
  });

  for (const cover of [false, true]) {
    for (const action of ['copyCurrentPage', 'exportCurrentPage'] as const) {
      test(`${action} captures visible ${cover ? 'cover' : 'content'} and removes temporary DOM`, async () => {
        (view as any).pluginSettings.cover.enabled = cover;
        await (view as any)[action]();

        expect(captures).toHaveLength(1);
        const capture = captures[0];
        expect(capture.root.style.width).toBe('1080px');
        expect(capture.root.style.height).toBe('1440px');
        expect(capture.root.textContent).toContain(cover ? '导出测试' : '需要导出的正文内容。');
        expect(capture.root.style.opacity).not.toBe('0');
        expect(capture.root.style.visibility).not.toBe('hidden');
        expect(logError).not.toHaveBeenCalled();
        if (action === 'copyCurrentPage') {
          expect(clipboardWrite).toHaveBeenCalledTimes(1);
          expect(clipboardWrite.mock.calls[0][0][0].data['image/png']).toBe(capture.blob);
          expect((view as any).copyBtn.disabled).toBe(false);
          expect((view as any).copyBtn.textContent).toBe('Copy');
        } else {
          expect(download).toHaveBeenCalledWith(capture.blob, `导出测试-${cover ? '00' : '01'}.png`);
          expect((view as any).pngBtn.disabled).toBe(false);
          expect((view as any).pngBtn.textContent).toBe('PNG');
        }
        expect(document.body.children.length).toBe(bodyChildCount);
      });
    }
  }

  test('ZIP keeps visible cover and content with the original filenames', async () => {
    (view as any).pluginSettings.cover.enabled = true;
    await (view as any).exportAllPages();

    expect(captures).toHaveLength(2);
    for (const capture of captures) expect(capture.root.style.opacity).not.toBe('0');
    expect(captures[0].root.textContent).toContain('导出测试');
    expect(captures[1].root.textContent).toContain('需要导出的正文内容。');
    expect(download).toHaveBeenCalledTimes(1);
    const [blob, fileName] = download.mock.calls[0];
    expect(fileName).toBe('导出测试.zip');
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(['导出测试-00.png', '导出测试-01.png']);
    expect(document.body.children.length).toBe(bodyChildCount);
  });

  for (const [action, field, text] of [
    ['copyCurrentPage', 'copyBtn', 'Copy'],
    ['exportCurrentPage', 'pngBtn', 'PNG'],
    ['exportAllPages', 'zipBtn', 'ZIP'],
  ]) {
    test(`${action} cleans up and restores its button after a render failure`, async () => {
      const error = new Error('render failed');
      render.mockRejectedValueOnce(error);
      await (view as any)[action]();

      expect(logError).toHaveBeenCalledWith(
        action === 'copyCurrentPage' ? 'Smart RED: copy failed' : 'Smart RED: export failed', error
      );
      expect(download).not.toHaveBeenCalled();
      expect(clipboardWrite).not.toHaveBeenCalled();
      expect((view as any)[field].disabled).toBe(false);
      expect((view as any)[field].textContent).toBe(text);
      expect(document.body.children.length).toBe(bodyChildCount);
    });
  }
});
