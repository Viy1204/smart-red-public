import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { blockHeight, cjkLines, makeContext, paragraph } from "./pagination-helpers";

describe("paginateMeasured basics", () => {
  test("empty input returns no pages", () => {
    expect(paginateMeasured([], makeContext(100))).toEqual([]);
  });

  test("non-positive available height returns no pages", () => {
    const blocks = [paragraph(cjkLines(2))];
    expect(paginateMeasured(blocks, makeContext(0))).toEqual([]);
    expect(paginateMeasured(blocks, makeContext(-50))).toEqual([]);
  });

  test("single small block produces one page without continuation", () => {
    const block = paragraph(cjkLines(2));
    const pages = paginateMeasured([block], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].pageIndex).toBe(0);
    expect(pages[0].blocks.map((b) => b.content)).toEqual([block.content]);
    expect(pages[0].hasContinuation).toBe(false);
    expect(pages[0].continuationFrom).toBeUndefined();
  });

  test("blocks that fit together stay on one page in order", () => {
    const blocks: SemanticBlock[] = [
      { type: BlockType.Heading, content: "标题", metadata: { level: 2 } },
      paragraph(cjkLines(3)),
      { type: BlockType.List, content: "- 一\n- 二" },
    ];
    const pages = paginateMeasured(blocks, makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([
      BlockType.Heading,
      BlockType.Paragraph,
      BlockType.List,
    ]);
  });

  test("a block exactly filling the page still fits", () => {
    const pages = paginateMeasured([paragraph(cjkLines(10))], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].hasContinuation).toBe(false);
  });

  test("page indexing and continuation links across multiple pages", () => {
    const blocks: SemanticBlock[] = [
      { type: BlockType.Image, content: "a.png", metadata: { height: 90 } },
      { type: BlockType.Image, content: "b.png", metadata: { height: 90 } },
      { type: BlockType.Image, content: "c.png", metadata: { height: 90 } },
    ];
    const pages = paginateMeasured(blocks, makeContext(100));

    expect(pages.map((p) => p.pageIndex)).toEqual([0, 1, 2]);
    expect(pages.map((p) => p.hasContinuation)).toEqual([true, true, false]);
    expect(pages.map((p) => p.continuationFrom)).toEqual([undefined, 0, 1]);
  });

  test("every page fits the available height and no content is lost", () => {
    const ctx = makeContext(100);
    const blocks = [
      paragraph(cjkLines(7, "一")),
      paragraph(cjkLines(8, "二")),
      paragraph(cjkLines(6, "三")),
      paragraph(cjkLines(9, "四")),
    ];
    const pages = paginateMeasured(blocks, ctx);

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(ctx.measure(page.blocks)).toBeLessThanOrEqual(100);
    }
    const joined = pages.flatMap((p) => p.blocks).map((b) => b.content).join("");
    expect(joined).toBe(blocks.map((b) => b.content).join(""));
  });

  test("no page is emitted empty", () => {
    const blocks: SemanticBlock[] = [
      paragraph(cjkLines(9, "甲")),
      { type: BlockType.HorizontalRule, content: "" },
      paragraph(cjkLines(9, "乙")),
    ];
    const pages = paginateMeasured(blocks, makeContext(100));

    for (const page of pages) {
      expect(page.blocks.length).toBeGreaterThan(0);
      expect(blockHeight(page.blocks[0])).toBeGreaterThan(0);
    }
  });
});
