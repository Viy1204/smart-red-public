import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

const hr: SemanticBlock = { type: BlockType.HorizontalRule, content: "" };

describe("degenerate inputs", () => {
  test("a document of only horizontal rules produces no pages", () => {
    expect(paginateMeasured([hr], makeContext(100))).toEqual([]);
    expect(paginateMeasured([hr, hr, hr], makeContext(100))).toEqual([]);
  });

  test("a whitespace-only paragraph still renders as a page", () => {
    const pages = paginateMeasured([paragraph("     ")], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks).toHaveLength(1);
  });

  test("a single short paragraph is returned unchanged", () => {
    const block = paragraph("短句。");
    const pages = paginateMeasured([block], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks[0].content).toBe("短句。");
  });

  test("paragraphs with hard line breaks keep their text across pages", () => {
    const content = `${cjkLines(6, "一")}\n${cjkLines(6, "二")}`;
    const ctx = makeContext(100);
    const pages = paginateMeasured([paragraph(content, { sourceBlockId: "hb" })], ctx);

    const joined = pages.flatMap((p) => p.blocks).map((b) => b.content).join("");
    expect(joined).toBe(content);
    for (const page of pages) {
      expect(ctx.measure(page.blocks)).toBeLessThanOrEqual(100);
    }
  });

  test("a page height smaller than one line clips each block onto its own page", () => {
    const blocks = [paragraph("第一句", { sourceBlockId: "a" }), paragraph("第二句", { sourceBlockId: "b" })];
    const pages = paginateMeasured(blocks, makeContext(5));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.content)).toEqual(["第一句"]);
    expect(pages[1].blocks.map((b) => b.content)).toEqual(["第二句"]);
  });

  test("mixed document keeps block order across pages", () => {
    const blocks: SemanticBlock[] = [
      { type: BlockType.Heading, content: "开篇", metadata: { level: 1 } },
      paragraph(cjkLines(6, "一"), { sourceBlockId: "p1" }),
      { type: BlockType.List, content: "- 甲\n- 乙\n- 丙" },
      paragraph(cjkLines(6, "二"), { sourceBlockId: "p2" }),
      { type: BlockType.CodeBlock, content: "a\nb\nc" },
      paragraph(cjkLines(6, "三"), { sourceBlockId: "p3" }),
    ];
    const pages = paginateMeasured(blocks, makeContext(100));

    // Every original block's content appears in order in the flattened output.
    const flattened = pages.flatMap((p) => p.blocks);
    const joined = flattened.map((b) => b.content).join("\n");
    let cursor = 0;
    for (const block of blocks) {
      const firstChunk = block.content.split("\n")[0];
      const idx = joined.indexOf(firstChunk, cursor);
      expect(idx).toBeGreaterThanOrEqual(0);
      cursor = idx;
    }
  });
});
