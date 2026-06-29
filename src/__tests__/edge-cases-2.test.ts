import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

describe("oversized unsplittable blocks", () => {
  test("an image taller than the page gets a page of its own", () => {
    const giant: SemanticBlock = {
      type: BlockType.Image,
      content: "huge.png",
      metadata: { height: 500 },
    };
    const pages = paginateMeasured([giant], makeContext(100));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks).toEqual([giant]);
  });

  test("an oversized image between paragraphs isolates onto its own page", () => {
    const before = paragraph(cjkLines(3, "前"), { sourceBlockId: "before" });
    const giant: SemanticBlock = {
      type: BlockType.Image,
      content: "huge.png",
      metadata: { height: 500 },
    };
    const after = paragraph(cjkLines(3, "后"), { sourceBlockId: "after" });
    const pages = paginateMeasured([before, giant, after], makeContext(100));

    expect(pages).toHaveLength(3);
    expect(pages[0].blocks.map((b) => b.content)).toEqual([before.content]);
    expect(pages[1].blocks).toEqual([giant]);
    expect(pages[2].blocks.map((b) => b.content)).toEqual([after.content]);
  });

  test("an unsplittable table taller than the page owns a page", () => {
    const table: SemanticBlock = {
      type: BlockType.Table,
      content: Array.from({ length: 15 }, (_, i) => `| 行${i} | 值${i} |`).join("\n"),
    };
    const pages = paginateMeasured([paragraph(cjkLines(3)), table], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[1].blocks).toEqual([table]);
  });

  test("a single-line paragraph too wide for the page is emitted clipped", () => {
    // One unbreakable line: cannot split, so it owns the page even if too tall.
    const pages = paginateMeasured([paragraph(cjkLines(1))], makeContext(5));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks).toHaveLength(1);
  });

  test("a one-line code block never splits", () => {
    const code: SemanticBlock = { type: BlockType.CodeBlock, content: "const x = 1;" };
    const pages = paginateMeasured([paragraph(cjkLines(10)), code], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[1].blocks.some((b) => b.type === BlockType.CodeBlock)).toBe(true);
    const codeOut = pages.flatMap((p) => p.blocks).find((b) => b.type === BlockType.CodeBlock);
    expect(codeOut?.content).toBe("const x = 1;");
  });

  test("a single-item list never splits", () => {
    const list: SemanticBlock = { type: BlockType.List, content: "- 唯一一项" };
    const pages = paginateMeasured([paragraph(cjkLines(10)), list], makeContext(100));

    expect(pages).toHaveLength(2);
    const listOut = pages.flatMap((p) => p.blocks).find((b) => b.type === BlockType.List);
    expect(listOut?.content).toBe("- 唯一一项");
  });
});
