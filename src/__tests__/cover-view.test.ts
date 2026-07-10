import './dom-setup';
import { describe, test, expect, beforeEach } from 'bun:test';
import { RedView } from '../view';
import { DEFAULT_SETTINGS, THEME_PRESETS, type SmartRedSettings } from '../settings';
import { WorkspaceLeaf, App, TFile } from './obsidian-mock';

function makeAppWithFile(content: string) {
  const app = new App();
  const file = new TFile('test.md', 'test.md', 'md');
  app.workspace.getActiveFile = () => file;
  app.vault.read = async () => content;
  return app;
}

function makeView(settings: SmartRedSettings) {
  const app = makeAppWithFile('# 标题\n\n正文内容。');
  const leaf = new WorkspaceLeaf(app);
  const view = new RedView(leaf as any, settings);
  (view as any).app = app;
  return view;
}

function withCover(enabled: boolean): SmartRedSettings {
  return {
    ...DEFAULT_SETTINGS,
    cover: { ...DEFAULT_SETTINGS.cover, enabled },
  };
}

describe('cover page model', () => {
  let view: RedView;

  beforeEach(() => {
    view = makeView(withCover(true));
  });

  test('prepends a cover page when enabled and content exists', () => {
    (view as any).decisions = [
      { pageIndex: 0, blocks: [], hasContinuation: false },
      { pageIndex: 1, blocks: [], hasContinuation: false },
    ];
    const pages = (view as any).getPages();
    expect(pages).toHaveLength(3);
    expect(pages[0].kind).toBe('cover');
    expect(pages[1].kind).toBe('content');
    expect(pages[1].decision.pageIndex).toBe(0);
  });

  test('no orphan cover for an empty note', () => {
    (view as any).decisions = [];
    expect((view as any).getPages()).toHaveLength(0);
  });

  test('content decisions keep their pageIndex (footer numbering unchanged)', () => {
    (view as any).decisions = [
      { pageIndex: 0, blocks: [], hasContinuation: true },
      { pageIndex: 1, blocks: [], hasContinuation: false },
    ];
    const pages = (view as any).getPages();
    const contentPages = pages.filter((p: any) => p.kind === 'content');
    expect(contentPages.map((p: any) => p.decision.pageIndex)).toEqual([0, 1]);
  });

  test('cover disabled leaves the page list untouched', () => {
    const plain = makeView(withCover(false));
    (plain as any).decisions = [{ pageIndex: 0, blocks: [], hasContinuation: false }];
    const pages = (plain as any).getPages();
    expect(pages).toHaveLength(1);
    expect(pages[0].kind).toBe('content');
  });

  test('cover context carries the document title and showAuthor', () => {
    (view as any).documentTitle = '创业公司没有光环';
    const ctx = (view as any).getCoverContext();
    expect(ctx.title).toBe('创业公司没有光环');
    expect(ctx.showAuthor).toBe(true);
  });
});

describe('theme presets', () => {
  test('ids are unique and colors are valid hex', () => {
    const ids = new Set(THEME_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(THEME_PRESETS.length);
    for (const preset of THEME_PRESETS) {
      for (const value of Object.values(preset.theme)) {
        expect(String(value)).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  test('every preset fills the full color set', () => {
    for (const preset of THEME_PRESETS) {
      expect(Object.keys(preset.theme).sort()).toEqual(
        ['accentColor', 'backgroundColor', 'boldColor', 'h1Color', 'h2Color', 'h3Color', 'textColor'].sort()
      );
    }
  });
});
