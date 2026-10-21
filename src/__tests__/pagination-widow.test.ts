import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { MarkdownParser } from "../markdown-parser";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

describe("avoidWidows", () => {
  test("prevents a single-line page when a line would carry over", () => {
    const ctx = { ...makeContext(100), avoidWidows: true };
    const pages = paginateMeasured(
      [paragraph(cjkLines(11, "首"), { sourceBlockId: "a" })],
      ctx
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks[0].content.length).toBeLessThanOrEqual(10 * 5);
    // The tail must be more than one rendered line, not a lone line on a card.
    expect(pages[1].blocks[0].content.length).toBeGreaterThan(5);
    expect(pages[0].blocks[0].content + pages[1].blocks[0].content).toBe(
      cjkLines(11, "首")
    );
  });

  test("keeps the original greedy split when disabled", () => {
    const ctx = { ...makeContext(100), avoidWidows: false };
    const pages = paginateMeasured(
      [paragraph(cjkLines(11, "首"), { sourceBlockId: "a" })],
      ctx
    );

    expect(pages[0].blocks[0].content.length).toBe(10 * 5);
    expect(pages[1].blocks[0].content.length).toBe(1 * 5);
  });

  test("splits a soft-break paragraph taller than a page despite a two-line estimate", () => {
    const content = Array(20).fill("甲").join("\n");
    const blocks = new MarkdownParser().parse(content, { softLineBreaks: true });
    const lineHeight = 40 * 1.7;
    const ctx = {
      availableHeight: 1174,
      avoidWidows: true,
      measure: (pageBlocks: typeof blocks) => pageBlocks.reduce(
        (height, block) => height + block.content.split("\n").length * lineHeight,
        0
      ),
      breakWidthFor: () => 46,
    };

    const pages = paginateMeasured(blocks, ctx);

    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(ctx.measure(page.blocks)).toBeLessThanOrEqual(ctx.availableHeight);
    }
    expect(pages.flatMap((page) => page.blocks).map((block) => block.content).join("")).toBe(content);
  });

  test("moves a short paragraph whole instead of stranding its last line", () => {
    const ctx = { ...makeContext(100), avoidWidows: true };
    const first = paragraph(cjkLines(9, "甲"), { sourceBlockId: "first" });
    const second = paragraph(cjkLines(2, "乙"), { sourceBlockId: "second" });
    const pages = paginateMeasured([first, second], ctx);

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks[0].metadata?.sourceBlockId).toBe("first");
    expect(pages[1].blocks[0].metadata?.sourceBlockId).toBe("second");
    expect(pages[1].blocks[0].content).toBe(second.content);
  });
});
