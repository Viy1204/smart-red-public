import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

describe("greedy page fill (no last-page balancing)", () => {
  test("packs each page to the brim; the last page may be short", () => {
    const listA: SemanticBlock = {
      type: BlockType.List,
      content: Array.from({ length: 7 }, (_, i) => `- 甲${i}`).join("\n"),
    };
    const listB: SemanticBlock = {
      type: BlockType.List,
      content: Array.from({ length: 2 }, (_, i) => `- 乙${i}`).join("\n"),
    };
    const paraC = paragraph(cjkLines(2, "丙"), { sourceBlockId: "c" });
    const ctx = makeContext(100);
    const pages = paginateMeasured([listA, listB, paraC], ctx);

    expect(pages).toHaveLength(2);
    // Page 1 is filled completely; content is NOT pulled back to even the pages.
    expect(ctx.measure(pages[0].blocks)).toBe(100);
    expect(ctx.measure(pages[1].blocks)).toBeLessThan(ctx.measure(pages[0].blocks));
  });

  test("splits a long paragraph to fill the page; remainder flows to a shorter last page", () => {
    const content = cjkLines(12);
    const ctx = makeContext(100);
    const pages = paginateMeasured([paragraph(content, { sourceBlockId: "s" })], ctx);

    expect(pages).toHaveLength(2);
    expect(ctx.measure(pages[0].blocks)).toBe(100);
    // Remainder is not balanced back up; the last page stays short.
    expect(ctx.measure(pages[1].blocks)).toBeLessThan(ctx.measure(pages[0].blocks));
    expect(pages[1].blocks).toHaveLength(1);
    expect(pages[0].blocks[0].content + pages[1].blocks[0].content).toBe(content);
  });

  test("packs images one per page when two will not fit together", () => {
    const imgA: SemanticBlock = { type: BlockType.Image, content: "a.png", metadata: { height: 90 } };
    const imgB: SemanticBlock = { type: BlockType.Image, content: "b.png", metadata: { height: 70 } };
    const pages = paginateMeasured([imgA, imgB], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks).toEqual([imgA]);
    expect(pages[1].blocks).toEqual([imgB]);
  });

  test("does not merge unrelated paragraphs across a page break", () => {
    const big = paragraph(cjkLines(10, "甲"), { sourceBlockId: "big" });
    const small = paragraph(cjkLines(2, "乙"), { sourceBlockId: "small" });
    const pages = paginateMeasured([big, small], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.content)).toEqual([big.content]);
    expect(pages[1].blocks.map((b) => b.content)).toEqual([small.content]);
  });

  test("never strands a heading at the previous page bottom while balancing", () => {
    const lead = paragraph(cjkLines(7), { sourceBlockId: "lead" });
    const heading: SemanticBlock = { type: BlockType.Heading, content: "章节", metadata: { level: 2 } };
    const body = paragraph(cjkLines(5, "正"), { sourceBlockId: "body" });
    const pages = paginateMeasured([lead, heading, body], makeContext(100));

    expect(pages).toHaveLength(2);
    // The heading keeps at least one line of its body on the same page.
    expect(pages[0].blocks.map((b) => b.type)).toEqual([
      BlockType.Paragraph,
      BlockType.Heading,
      BlockType.Paragraph,
    ]);
    const total = pages[0].blocks[2].content + pages[1].blocks.map((b) => b.content).join("");
    expect(total).toBe(body.content);
  });

  test("does not balance when the last page opens with its own section heading", () => {
    // lead fills page 1; the closing section (heading + short body) lands on
    // the last page and stays untouched instead of stealing from page 1.
    const lead = paragraph(cjkLines(10), { sourceBlockId: "lead" });
    const heading: SemanticBlock = { type: BlockType.Heading, content: "最后", metadata: { level: 2 } };
    const body = paragraph(cjkLines(2, "尾"), { sourceBlockId: "body" });
    const pages = paginateMeasured([lead, heading, body], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.content).join("").length).toBe(10 * 5);
    expect(pages[1].blocks.map((b) => b.type)).toEqual([BlockType.Heading, BlockType.Paragraph]);
  });
});
