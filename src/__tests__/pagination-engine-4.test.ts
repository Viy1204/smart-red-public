import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

const hr: SemanticBlock = { type: BlockType.HorizontalRule, content: "" };

describe("horizontal rule placement", () => {
  test("an HR at the start of the document is dropped", () => {
    const pages = paginateMeasured([hr, paragraph(cjkLines(2))], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
  });

  test("an HR forces a page break and is not rendered", () => {
    const pages = paginateMeasured(
      [paragraph(cjkLines(3, "前")), hr, paragraph(cjkLines(3, "后"))],
      makeContext(100)
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
    expect(pages[1].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
  });

  test("last-page balancing never pulls content across an explicit break", () => {
    // The author put a `---` before a deliberately short final section; it must
    // stay short instead of stealing lines from the previous page.
    const pages = paginateMeasured(
      [paragraph(cjkLines(8, "前"), { sourceBlockId: "a" }), hr, paragraph(cjkLines(1, "尾"), { sourceBlockId: "b" })],
      makeContext(100)
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.content).join("").length).toBe(8 * 5);
    expect(pages[1].blocks.map((b) => b.content).join("").length).toBe(1 * 5);
  });

  test("an HR that does not fit at the page bottom is dropped with the break", () => {
    const pages = paginateMeasured(
      [paragraph(cjkLines(10, "满")), hr, paragraph(cjkLines(3, "后"))],
      makeContext(100)
    );

    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page.blocks.some((b) => b.type === BlockType.HorizontalRule)).toBe(false);
    }
  });

  test("an HR right before a page break is stripped from the page end", () => {
    const pages = paginateMeasured(
      [paragraph(cjkLines(9, "前")), hr, paragraph(cjkLines(10, "后"))],
      makeContext(100)
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
    expect(pages[1].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
  });

  test("no page ever starts with an HR", () => {
    const blocks: SemanticBlock[] = [];
    for (let i = 0; i < 6; i++) {
      blocks.push(paragraph(cjkLines(7, "字"), { sourceBlockId: `p${i}` }));
      blocks.push(hr);
    }
    const pages = paginateMeasured(blocks, makeContext(100));

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.blocks[0].type).not.toBe(BlockType.HorizontalRule);
    }
  });
});

describe("heading orphan control", () => {
  test("a heading stranded at the page bottom moves to the next page", () => {
    const lead = paragraph(cjkLines(8), { sourceBlockId: "lead" });
    const heading: SemanticBlock = { type: BlockType.Heading, content: "章节", metadata: { level: 2 } };
    const body = paragraph(cjkLines(5, "正"), { sourceBlockId: "body" });
    const pages = paginateMeasured([lead, heading, body], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
    expect(pages[1].blocks[0].type).toBe(BlockType.Heading);
  });

  test("a heading stays when two lines of its follower also fit", () => {
    const lead = paragraph(cjkLines(7), { sourceBlockId: "lead" });
    const heading: SemanticBlock = { type: BlockType.Heading, content: "章节", metadata: { level: 2 } };
    const body = paragraph(cjkLines(5, "正"), { sourceBlockId: "body" });
    const pages = paginateMeasured([lead, heading, body], makeContext(100));

    expect(pages[0].blocks.some((b) => b.type === BlockType.Heading)).toBe(true);
    // Balancing never strands the heading: it keeps at least one body line.
    expect(pages[0].blocks[pages[0].blocks.length - 1].type).toBe(BlockType.Paragraph);
    const last = pages[pages.length - 1];
    expect(last.blocks.every((b) => b.type === BlockType.Paragraph)).toBe(true);
  });

  test("a heading keeps its place when the follower can never fit on any page", () => {
    const lead = paragraph(cjkLines(8), { sourceBlockId: "lead" });
    const heading: SemanticBlock = { type: BlockType.Heading, content: "章节", metadata: { level: 2 } };
    const giant: SemanticBlock = { type: BlockType.Image, content: "big.png", metadata: { height: 500 } };
    const pages = paginateMeasured([lead, heading, giant], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([
      BlockType.Paragraph,
      BlockType.Heading,
    ]);
    expect(pages[1].blocks).toEqual([giant]);
  });

  test("a heading at the top of a page never triggers a break", () => {
    const heading: SemanticBlock = { type: BlockType.Heading, content: "章节", metadata: { level: 2 } };
    const pages = paginateMeasured([heading, paragraph(cjkLines(3))], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks[0].type).toBe(BlockType.Heading);
  });
});

describe("spacer placement", () => {
  const spacer: SemanticBlock = { type: BlockType.Spacer, content: "", metadata: { gaps: 1 } };

  test("a spacer inside a page is kept", () => {
    const pages = paginateMeasured(
      [paragraph(cjkLines(3, "前")), spacer, paragraph(cjkLines(3, "后"))],
      makeContext(100)
    );

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([
      BlockType.Paragraph,
      BlockType.Spacer,
      BlockType.Paragraph,
    ]);
  });

  test("a spacer never opens a page and never trails a page end", () => {
    const pages = paginateMeasured(
      [paragraph(cjkLines(10, "满")), spacer, paragraph(cjkLines(10, "后"))],
      makeContext(100)
    );

    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page.blocks[0].type).not.toBe(BlockType.Spacer);
      expect(page.blocks[page.blocks.length - 1].type).not.toBe(BlockType.Spacer);
    }
  });
});
