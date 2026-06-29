import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { BlockType, type SemanticBlock } from "../types";
import { cjkLines, makeContext, paragraph } from "./pagination-helpers";

function codeBlock(lines: string[], metadata?: Record<string, unknown>): SemanticBlock {
  return { type: BlockType.CodeBlock, content: lines.join("\n"), metadata };
}

function codeLines(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `line ${i + 1};`);
}

describe("code block splitting", () => {
  test("splits by line and marks the continuation", () => {
    const pages = paginateMeasured([codeBlock(codeLines(12))], makeContext(100));

    expect(pages).toHaveLength(2);
    const first = pages[0].blocks[0];
    const second = pages[1].blocks[0];
    expect(first.content.split("\n")).toHaveLength(10);
    expect(second.content.split("\n")).toHaveLength(2);
    expect(first.metadata?.isCodeContinuation).toBe(false);
    expect(first.metadata?.startLineNumber).toBe(1);
    expect(first.metadata?.endLineNumber).toBe(10);
    expect(second.metadata?.isCodeContinuation).toBe(true);
    expect(second.metadata?.startLineNumber).toBe(11);
    expect(first.content + "\n" + second.content).toBe(codeLines(12).join("\n"));
  });

  test("line numbers stay continuous across three pages", () => {
    const pages = paginateMeasured([codeBlock(codeLines(25))], makeContext(100));

    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.blocks[0].metadata?.startLineNumber)).toEqual([1, 11, 21]);
    expect(pages[1].blocks[0].metadata?.isCodeContinuation).toBe(true);
    expect(pages[2].blocks[0].metadata?.isCodeContinuation).toBe(true);
  });

  test("code splits after preceding content on the same page", () => {
    const lead = paragraph(cjkLines(5));
    const pages = paginateMeasured([lead, codeBlock(codeLines(8))], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks).toHaveLength(2);
    expect(pages[0].blocks[1].content.split("\n")).toHaveLength(5);
    expect(pages[1].blocks[0].content.split("\n")).toHaveLength(3);
  });
});

describe("list splitting", () => {
  test("splits by children when present", () => {
    const children: SemanticBlock[] = Array.from({ length: 12 }, (_, i) => ({
      type: BlockType.Paragraph,
      content: `列表项内容${i}`,
    }));
    const list: SemanticBlock = {
      type: BlockType.List,
      content: children.map((c) => c.content).join("\n"),
      children,
    };
    const pages = paginateMeasured([list], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks[0].children).toHaveLength(10);
    expect(pages[1].blocks[0].children).toHaveLength(2);
    expect(
      pages[0].blocks[0].content + "\n" + pages[1].blocks[0].content
    ).toBe(list.content);
  });

  test("splits by item lines when there are no children", () => {
    const lines = Array.from({ length: 12 }, (_, i) => `- 条目${i}`);
    const list: SemanticBlock = { type: BlockType.List, content: lines.join("\n") };
    const pages = paginateMeasured([list], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks[0].content.split("\n")).toHaveLength(10);
    expect(pages[1].blocks[0].content.split("\n")).toHaveLength(2);
  });

  test("keeps multi-line items together when splitting", () => {
    const lines: string[] = [];
    for (let i = 0; i < 6; i++) {
      lines.push(`- 项目${i}`);
      lines.push(`  续行${i}`);
    }
    const list: SemanticBlock = { type: BlockType.List, content: lines.join("\n") };
    const pages = paginateMeasured([list], makeContext(100));

    expect(pages).toHaveLength(2);
    for (const page of pages) {
      const pageLines = page.blocks[0].content.split("\n");
      expect(pageLines[0].startsWith("-")).toBe(true);
      expect(pageLines.length % 2).toBe(0);
    }
  });
});

describe("blockquote splitting", () => {
  test("splits by children", () => {
    const children: SemanticBlock[] = Array.from({ length: 8 }, (_, i) => ({
      type: BlockType.Paragraph,
      content: `引用段${i}`,
    }));
    const quote: SemanticBlock = {
      type: BlockType.Blockquote,
      content: children.map((c) => c.content).join("\n\n"),
      children,
    };
    const pages = paginateMeasured([quote], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks[0].children).toHaveLength(5);
    expect(pages[1].blocks[0].children).toHaveLength(3);
    const combined = [
      ...(pages[0].blocks[0].children ?? []),
      ...(pages[1].blocks[0].children ?? []),
    ];
    expect(combined.map((c) => c.content)).toEqual(children.map((c) => c.content));
  });

  test("a blockquote without children is not split and owns a page", () => {
    const quote: SemanticBlock = {
      type: BlockType.Blockquote,
      content: Array.from({ length: 15 }, (_, i) => `引用${i}`).join("\n"),
    };
    const pages = paginateMeasured([paragraph(cjkLines(3)), quote], makeContext(100));

    expect(pages).toHaveLength(2);
    expect(pages[0].blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
    expect(pages[1].blocks).toEqual([quote]);
  });
});
