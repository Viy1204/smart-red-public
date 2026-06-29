import { describe, expect, test } from "bun:test";
import { normalizeParagraphFragments, paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { BREAK_WIDTH, LINE_HEIGHT, blockHeight, cjkLines, makeContext, paragraph } from "./pagination-helpers";

describe("paragraph splitting", () => {
  test("an overlong paragraph splits across two pages without losing text", () => {
    const content = cjkLines(14);
    const pages = paginateMeasured([paragraph(content)], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].hasContinuation).toBe(true);
    expect(pages[0].blocks[0].content + pages[1].blocks[0].content).toBe(content);
  });

  test("split fragments carry source and offset metadata", () => {
    const content = cjkLines(14);
    const source = paragraph(content, { sourceBlockId: "para-x" });
    const pages = paginateMeasured([source], makeContext(100));

    const first = pages[0].blocks[0];
    const second = pages[1].blocks[0];
    expect(first.metadata?.sourceBlockId).toBe("para-x");
    expect(second.metadata?.sourceBlockId).toBe("para-x");
    expect(first.metadata?.fragmentStart).toBe(0);
    expect(first.metadata?.fragmentEnd).toBe(first.content.length);
    expect(second.metadata?.fragmentStart).toBe(first.content.length);
    expect(second.metadata?.fragmentEnd).toBe(content.length);
  });

  test("a paragraph following other content splits to fill the page bottom", () => {
    const lead = paragraph(cjkLines(6, "前"), { sourceBlockId: "lead" });
    const long = paragraph(cjkLines(11, "正"), { sourceBlockId: "long" });
    const ctx = makeContext(100);
    const pages = paginateMeasured([lead, long], ctx);

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks).toHaveLength(2);
    expect(pages[0].blocks[0].content).toBe(lead.content);
    expect(pages[0].blocks[1].content.length).toBeGreaterThan(0);
    expect(ctx.measure(pages[0].blocks)).toBeLessThanOrEqual(100);
    expect(
      pages[0].blocks[1].content + pages[1].blocks.map((b) => b.content).join("")
    ).toBe(long.content);
  });

  test("splits fill the page bottom even when only one line carries over", () => {
    // paraA has 11 lines while a page holds 10: the page is filled with 10
    // lines and the single leftover line carries to the next page. Filling
    // the bottom beats widow avoidance.
    const paraA = paragraph(cjkLines(11, "首"), { sourceBlockId: "a" });
    const paraB = paragraph(cjkLines(9, "次"), { sourceBlockId: "b" });
    const pages = paginateMeasured([paraA, paraB], makeContext(100));

    expect(pages[0].blocks).toHaveLength(1);
    expect(pages[0].blocks[0].content.length).toBe(10 * 5);
    expect(pages[1].blocks[0].metadata?.sourceBlockId).toBe("a");
    expect(pages[1].blocks[0].content.length).toBe(1 * 5);
  });

  test("a very long paragraph spans three or more pages", () => {
    const content = cjkLines(28);
    const ctx = makeContext(100);
    const pages = paginateMeasured([paragraph(content, { sourceBlockId: "epic" })], ctx);

    expect(pages.length).toBeGreaterThanOrEqual(3);
    for (const page of pages) {
      expect(ctx.measure(page.blocks)).toBeLessThanOrEqual(100);
      for (const block of page.blocks) {
        expect(block.metadata?.sourceBlockId).toBe("epic");
      }
    }
    expect(pages.flatMap((p) => p.blocks).map((b) => b.content).join("")).toBe(content);
  });
});

describe("normalizeParagraphFragments", () => {
  test("merges adjacent fragments of the same source paragraph", () => {
    const merged = normalizeParagraphFragments([
      paragraph("我自己能干", { sourceBlockId: "p1", fragmentStart: 0, fragmentEnd: 5 }),
      paragraph("的就自己来。", { sourceBlockId: "p1", fragmentStart: 5, fragmentEnd: 11 }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe("我自己能干的就自己来。");
    expect(merged[0].metadata?.fragmentStart).toBe(0);
    expect(merged[0].metadata?.fragmentEnd).toBe(11);
  });

  test("does not merge paragraphs from different sources or other block types", () => {
    const blocks = [
      paragraph("第一段。", { sourceBlockId: "a" }),
      paragraph("第二段。", { sourceBlockId: "b" }),
      { type: BlockType.Heading, content: "标题", metadata: { sourceBlockId: "a" } },
    ];
    const normalized = normalizeParagraphFragments(blocks);

    expect(normalized).toHaveLength(3);
    expect(normalized.map((b) => b.content)).toEqual(["第一段。", "第二段。", "标题"]);
  });

  test("merges fragments that land on the same page during pagination", () => {
    // The first fragment ends a page and balancing pulls the rest back next to
    // it; pages coming out of paginateMeasured never hold two adjacent
    // fragments of the same paragraph.
    const pages = paginateMeasured(
      [paragraph(cjkLines(14), { sourceBlockId: "m" })],
      makeContext(100)
    );

    for (const page of pages) {
      for (let i = 1; i < page.blocks.length; i++) {
        const prev = page.blocks[i - 1];
        const curr = page.blocks[i];
        expect(
          prev.type === BlockType.Paragraph &&
          curr.type === BlockType.Paragraph &&
          prev.metadata?.sourceBlockId === curr.metadata?.sourceBlockId
        ).toBe(false);
      }
    }
  });
});

describe("split granularity vs real rendering", () => {
  test("page bottom stays filled even when estimated lines render taller than expected", () => {
    // breakWidthFor hands out lines twice as wide as the measurer's: each
    // "estimated line" renders as two real lines. The binary search must still
    // land within one real line of the page bottom instead of pushing the
    // whole paragraph away.
    const ctx = {
      availableHeight: 100,
      measure: (blocks: SemanticBlock[]) =>
        blocks.reduce((sum, block) => sum + blockHeight(block), 0),
      breakWidthFor: () => BREAK_WIDTH * 2, // estimated lines = 10 CJK chars
    };
    const lead = paragraph(cjkLines(7, "前"), { sourceBlockId: "lead" });
    // tail is large enough that the last page stays above the balance threshold.
    const tail = paragraph(cjkLines(12, "后"), { sourceBlockId: "tail" });
    const pages = paginateMeasured([lead, tail], ctx);

    const firstPageHeight = ctx.measure(pages[0].blocks);
    expect(firstPageHeight).toBeGreaterThanOrEqual(100 - 2 * LINE_HEIGHT);
    expect(firstPageHeight).toBeLessThanOrEqual(100);
  });
});
