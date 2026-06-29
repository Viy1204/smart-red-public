import { test, expect, describe } from "bun:test";
import { MarkdownParser } from "../markdown-parser";
import { BlockType } from "../types";

const p = new MarkdownParser();

describe("md-parser: paragraphs and headings", () => {
  test("empty input returns empty array", () => {
    expect(p.parse("")).toEqual([]);
  });

  test("single paragraph", () => {
    const blocks = p.parse("Hello world");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("Hello world");
  });

  test("multi-line paragraph", () => {
    const blocks = p.parse("Line one\nLine two\nLine three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("Line one Line two Line three");
  });

  test("soft line breaks join Chinese text without extra spaces", () => {
    const blocks = p.parse("从A+掉到A,你\n会怎么想");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("从A+掉到A,你会怎么想");
  });

  test("explicit hard line breaks are preserved inside paragraphs", () => {
    const spaces = p.parse("第一行  \n第二行");
    const slash = p.parse("第一行\\\n第二行");

    expect(spaces[0].content).toBe("第一行\n第二行");
    expect(slash[0].content).toBe("第一行\n第二行");
  });

  test("two paragraphs separated by blank line", () => {
    const blocks = p.parse("First para\n\nSecond para");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("First para");
    expect(blocks[1].type).toBe(BlockType.Paragraph);
    expect(blocks[1].content).toBe("Second para");
  });

  test("h1 heading", () => {
    const blocks = p.parse("# Title");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Heading);
    expect(blocks[0].content).toBe("Title");
    expect(blocks[0].metadata?.level).toBe(1);
  });

  test("h3 heading", () => {
    const blocks = p.parse("### Section");
    expect(blocks[0].metadata?.level).toBe(3);
    expect(blocks[0].content).toBe("Section");
  });

  test("h6 heading", () => {
    const blocks = p.parse("###### Deep");
    expect(blocks[0].metadata?.level).toBe(6);
  });

  test("heading followed by paragraph", () => {
    const blocks = p.parse("# Title\n\nSome text here");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe(BlockType.Heading);
    expect(blocks[1].type).toBe(BlockType.Paragraph);
  });
});
