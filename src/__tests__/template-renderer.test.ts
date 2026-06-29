import "./dom-setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { TemplateRenderer, CARD_WIDTH, CARD_HEIGHT } from "../template-renderer";
import { editorialTemplate, monochromeTemplate, noirMagazineTemplate } from "../templates/gallery";
import { BlockType } from "../types";
import type { PaginationDecision } from "../pagination-engine";

function makeBlock(type: BlockType, content: string) {
  return { type, content };
}

function makeDecision(
  idx: number,
  blocks: any[],
  hasContinuation = false
): PaginationDecision {
  return {
    pageIndex: idx,
    blocks,
    hasContinuation,
  };
}

describe("TemplateRenderer", () => {
  let renderer: TemplateRenderer;

  beforeEach(() => {
    renderer = new TemplateRenderer();
  });

  test("renderCard creates Shadow DOM with card element", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Hello world");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const shadow = renderer.renderCard(container, [block], page, editorialTemplate);

    expect(shadow).toBeDefined();
    expect(container.shadowRoot).toBe(shadow);
    const card = shadow.querySelector(".sr-editorial-card");
    expect(card).not.toBeNull();
  });

  test("renderCard applies dimensions without overriding template padding", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Test");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const shadow = renderer.renderCard(container, [block], page, monochromeTemplate);
    const card = shadow.querySelector(".sr-monochrome-card") as HTMLElement;

    expect(card.style.width).toBe(`${CARD_WIDTH}px`);
    expect(card.style.height).toBe(`${CARD_HEIGHT}px`);
    expect(card.style.padding).toBe("");
  });

  test("Shadow DOM isolates styles from host", () => {
    const container = document.createElement("div");
    container.style.color = "red";
    const block = makeBlock(BlockType.Paragraph, "Isolated");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const shadow = renderer.renderCard(container, [block], page, noirMagazineTemplate);
    const card = shadow.querySelector(".sr-noir-card") as HTMLElement;

    expect(getComputedStyle(card).backgroundColor).not.toBe("red");
  });

  test("renderCard injects template styles into Shadow DOM", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Styled");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const shadow = renderer.renderCard(container, [block], page, editorialTemplate);
    const styleEl = shadow.querySelector("style");

    expect(styleEl).not.toBeNull();
    expect(styleEl!.textContent).toContain(".sr-editorial-card");
  });

  test("renderExportCard creates light DOM with card and styles", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Export me");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const card = renderer.renderExportCard(container, [block], page, editorialTemplate);

    expect(container.shadowRoot).toBeNull();
    expect(container.querySelector("link")).toBeNull();
    expect(container.querySelector("style")).toBeNull();
    expect(container.querySelector(".sr-editorial-card")).toBe(card);
    expect(container.style.width).toBe(`${CARD_WIDTH}px`);
    expect(container.style.height).toBe(`${CARD_HEIGHT}px`);
    expect(container.style.backgroundColor.length).toBeGreaterThan(0);
  });

  test("renderExportCard applies user chrome and theme overrides", () => {
    const container = document.createElement("div");
    const block = makeBlock(BlockType.Paragraph, "Branded export");
    const page: PaginationDecision = {
      pageIndex: 0,
      blocks: [block],
      hasContinuation: false,
    };

    const card = renderer.renderExportCard(container, [block], page, editorialTemplate, {
      fontSize: 20,
      chromeFontSize: 24,
      user: {
        nickname: "Viy",
        subtitle: "Creator",
        footer: "Custom footer",
        showHeader: true,
        showFooter: true,
      },
      theme: {
        backgroundColor: "#ffffff",
        textColor: "#111111",
        accentColor: "#ff2442",
        fontFamily: '"LXGW WenKai", serif',
        spacing: 30,
      },
    });

    expect(card.querySelector(".profile-name")?.textContent).toBe("Viy");
    expect(card.querySelector(".profile-subtitle")?.textContent).toBe("Creator");
    expect(card.querySelector(".card-chrome.bottom")?.textContent).toContain("Custom footer");
    expect(card.style.fontSize).toBe("20px");
    expect(card.style.getPropertyValue("--chrome-size")).toBe("24px");
    expect(card.style.getPropertyValue("--accent")).toBe("#ff2442");
    expect(card.style.getPropertyValue("--para-gap")).toBe("30px");
    expect(card.style.getPropertyValue("--body-font")).toBe('"LXGW WenKai", serif');
    expect(card.style.getPropertyValue("--display")).toBe('"LXGW WenKai", serif');
    expect(card.style.getPropertyValue("--caption")).toBe('"LXGW WenKai", serif');
  });
});
