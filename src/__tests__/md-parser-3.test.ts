import { test, expect, describe } from "bun:test";
import { MarkdownParser } from "../markdown-parser";
import { BlockType } from "../types";

const p = new MarkdownParser();

describe("md-parser: blockquotes and lists", () => {
  test("single-line blockquote", () => {
    const blocks = p.parse("> Hello");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Blockquote);
    expect(blocks[0].content).toBe("Hello");
  });

  test("multi-line blockquote", () => {
    const md = "> Line 1\n> Line 2\n> Line 3";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe("Line 1\nLine 2\nLine 3");
  });

  test("unordered list", () => {
    const md = "- Item 1\n- Item 2\n- Item 3";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.List);
    expect(blocks[0].content).toContain("- Item 1");
    expect(blocks[0].content).toContain("- Item 3");
  });

  test("ordered list", () => {
    const md = "1. First\n2. Second\n3. Third";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.List);
    expect(blocks[0].content).toContain("1. First");
  });

  test("horizontal rule with dashes", () => {
    const blocks = p.parse("---");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.HorizontalRule);
  });

  test("horizontal rule with asterisks", () => {
    const blocks = p.parse("***");
    expect(blocks[0].type).toBe(BlockType.HorizontalRule);
  });

  test("horizontal rule with underscores", () => {
    const blocks = p.parse("___");
    expect(blocks[0].type).toBe(BlockType.HorizontalRule);
  });
});