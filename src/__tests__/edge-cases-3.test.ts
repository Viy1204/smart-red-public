import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

describe("last page balancing", () => {
  test("pulls a whole trailing block back when the last page is too empty", () => {
    const listA: SemanticBlock = {
      type: BlockType.List,
      content: Array.from({ length: 7 }, (_, i) => `- 甲${i}`).join("\n"),
    };
    const listB: SemanticBlock = {
      type: BlockType.List,
      content: Array.from({ length: 2 }, (_, i) => `- 乙${i}`).join("\n"),
    };
    const paraC = paragraph(cjkLines(2, "丙"), { sourceBlockId: "c" });
    const pages = paginateMeasured([listA, listB, paraC], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks).toEqual([listA]);
    expect(pages[1].blocks.map((b) => b.content)).toEqual([listB.content, paraC.content]);
  });

  test("never drains the previous page below its minimum fill", () => {
    const listA: SemanticBlock = {
      type: BlockType.List,
      content: Array.from({ length: 4 }, (_, i) => `- 甲${i}`).join("\n"),
    };
    const listB: SemanticBlock = {
      type: BlockType.List,
      content: Array.from({ length: 5 }, (_, i) => `- 乙${i}`).join("\n"),
    };
    const paraC = paragraph(cjkLines(2, "丙"), { sourceBlockId: "c" });
    const pages = paginateMeasured([listA, listB, paraC], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks).toEqual([listA, listB]);
    expect(pages[1].blocks.map((b) => b.content)).toEqual([paraC.content]);
  });

  test("leaves a sufficiently full last page alone", () => {
    const imgA: SemanticBlock = { type: BlockType.Image, content: "a.png", metadata: { height: 90 } };
    const imgB: SemanticBlock = { type: BlockType.Image, content: "b.png", metadata: { height: 70 } };
    const pages = paginateMeasured([imgA, imgB], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks).toEqual([imgA]);
    expect(pages[1].blocks).toEqual([imgB]);
  });

  test("moves a same-source paragraph suffix line by line and merges it", () => {
    const content = cjkLines(12);
    const ctx = makeContext(100);
    const pages = paginateMeasured([paragraph(content, { sourceBlockId: "s" })], ctx);

    expect(pages).toHaveLength(2);
    // Both pages keep a healthy fill after the suffix moves back.
    expect(ctx.measure(pages[0].blocks)).toBeGreaterThanOrEqual(55);
    expect(ctx.measure(pages[1].blocks)).toBeGreaterThanOrEqual(55);
    // The moved suffix merged with the existing fragment into one paragraph.
    expect(pages[1].blocks).toHaveLength(1);
    expect(pages[0].blocks[0].content + pages[1].blocks[0].content).toBe(content);
  });

  test("does not move a suffix between unrelated paragraphs", () => {
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
