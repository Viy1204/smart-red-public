import "./dom-setup";
import { describe, test, expect } from "bun:test";
import { TemplateRenderer, CARD_WIDTH, CARD_HEIGHT } from "../template-renderer";
import { editorialTemplate, monochromeTemplate, templates } from "../templates/gallery";
import { BlockType } from "../types";
import type { PaginationDecision } from "../pagination-engine";

function makeBlock(type: BlockType, content: string) {
  return { type, content };
}

describe("Template switching", () => {
  const renderer = new TemplateRenderer();

  test("switching templates changes card class name", () => {
    const block = makeBlock(BlockType.Paragraph, "Switch test");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const classNames = templates.map((t) => {
      const container = document.createElement("div");
      const shadow = renderer.renderCard(container, [block], page, t);
      const card = shadow.querySelector("[class]") as HTMLElement;
      return card.className;
    });

    expect(classNames).toEqual([
      "sr-editorial-card",
      "sr-monochrome-card",
      "sr-neo-grid-card",
      "sr-warm-zine-card",
      "sr-noir-card",
      "sr-ivory-essay-card",
      "sr-red-ledger-card",
      "sr-slate-journal-card",
      "sr-pearl-magazine-card",
      "sr-ink-report-card",
      "sr-claude-card",
      "sr-minimax-card",
      "sr-xai-card",
      "sr-lovable-card",
      "sr-notion-card",
      "sr-figma-card",
      "sr-apple-card",
      "sr-the-verge-card",
      "sr-wired-card",
    ]);
  });

  test("ships every polished template", () => {
    expect(templates.length).toBe(19);
    expect(templates.map((template) => template.name)).toEqual([
      "editorial",
      "monochrome",
      "neo-grid",
      "warm-zine",
      "noir-magazine",
      "ivory-essay",
      "red-ledger",
      "slate-journal",
      "pearl-magazine",
      "ink-report",
      "claude",
      "minimax",
      "xai",
      "lovable",
      "notion",
      "figma",
      "apple",
      "the-verge",
      "wired",
    ]);
  });

  test("each template declares export measurement metadata", () => {
    for (const template of templates) {
      expect(template.baseFontSize).toBeGreaterThan(20);
      expect(template.lineHeightRatio).toBeGreaterThan(1.4);
      expect(template.backgroundColor).toMatch(/^#/);
      expect(template.styles).toContain(template.cardClassName);
    }
  });
});

describe("renderAllCards", () => {
  const renderer = new TemplateRenderer();

  test("renders multiple pages as separate Shadow DOM roots", () => {
    const parent = document.createElement("div");
    const block1 = makeBlock(BlockType.Paragraph, "Page 1");
    const block2 = makeBlock(BlockType.Paragraph, "Page 2");
    const decisions: PaginationDecision[] = [
      { pageIndex: 0, blocks: [block1], hasContinuation: true },
      { pageIndex: 1, blocks: [block2], hasContinuation: false },
    ];

    const roots = renderer.renderAllCards(parent, decisions, [block1, block2], editorialTemplate);

    expect(roots.length).toBe(2);
    expect(parent.children.length).toBe(2);
  });

  test("continuation hint renders inside bottom chrome when hasContinuation is true", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Content");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: true,
    };

    const shadow = renderer.renderCard(container, [block], page, editorialTemplate);
    const hint = shadow.querySelector(".continuation-hint");
    const bottom = shadow.querySelector(".card-chrome.bottom");

    expect(hint).not.toBeNull();
    expect(hint!.textContent).toContain("继续");
    expect(bottom?.contains(hint!)).toBe(true);
  });

  test("article title renders in the top right chrome", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Content");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const shadow = renderer.renderCard(container, [block], page, editorialTemplate, {
      sectionTitle: "看JD，要看它在妖什么地方",
    });
    const title = shadow.querySelector(".article-title-chrome");

    expect(title?.textContent).toBe("看JD，要看它在妖什么地方");
  });

  test("no continuation hint when hasContinuation is false", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Content");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const shadow = renderer.renderCard(container, [block], page, monochromeTemplate);
    const hint = shadow.querySelector(".continuation-hint");

    expect(hint).toBeNull();
  });
});

describe("theme overrides", () => {
  const renderer = new TemplateRenderer();

  test("bold color publishes --strong-color on the card", () => {
    const block = makeBlock(BlockType.Paragraph, "x");
    const page: PaginationDecision = { pageIndex: 0, blocks: [block], hasContinuation: false };
    const shadow = renderer.renderCard(document.createElement("div"), [block], page, editorialTemplate, {
      theme: { boldColor: "#ff0000" },
    });
    const card = shadow.querySelector(".sr-editorial-card") as HTMLElement;
    expect(card.style.getPropertyValue("--strong-color")).toBe("#ff0000");
  });

  test("per-level heading colors publish --h1/2/3-color", () => {
    const block = makeBlock(BlockType.Paragraph, "x");
    const page: PaginationDecision = { pageIndex: 0, blocks: [block], hasContinuation: false };
    const shadow = renderer.renderCard(document.createElement("div"), [block], page, editorialTemplate, {
      theme: { h1Color: "#111111", h2Color: "#222222", h3Color: "#333333" },
    });
    const card = shadow.querySelector(".sr-editorial-card") as HTMLElement;
    expect(card.style.getPropertyValue("--h1-color")).toBe("#111111");
    expect(card.style.getPropertyValue("--h2-color")).toBe("#222222");
    expect(card.style.getPropertyValue("--h3-color")).toBe("#333333");
  });
});

describe("Card dimensions", () => {
  test("CARD_WIDTH is 1080", () => {
    expect(CARD_WIDTH).toBe(1080);
  });

  test("CARD_HEIGHT is 1440", () => {
    expect(CARD_HEIGHT).toBe(1440);
  });
});
