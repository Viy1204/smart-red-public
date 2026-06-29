import { test, expect, describe } from "bun:test";
import { MarkdownParser } from "../markdown-parser";
import { BlockType } from "../types";

const p = new MarkdownParser();

describe("md-parser: code blocks and images", () => {
  test("code block with language", () => {
    const md = "```javascript\nconsole.log('hi');\n```";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.CodeBlock);
    expect(blocks[0].content).toBe("console.log('hi');");
    expect(blocks[0].metadata?.language).toBe("javascript");
  });

  test("code block without language", () => {
    const md = "```\nsome code\nmore code\n```";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.CodeBlock);
    expect(blocks[0].content).toBe("some code\nmore code");
    expect(blocks[0].metadata?.language).toBe("text");
  });

  test("code block preserves internal blank lines", () => {
    const md = "```\nline1\n\nline3\n```";
    const blocks = p.parse(md);
    expect(blocks[0].content).toBe("line1\n\nline3");
  });

  test("image block", () => {
    const md = "![Alt text](https://example.com/img.png)";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Image);
    expect(blocks[0].content).toBe("https://example.com/img.png");
    expect(blocks[0].metadata?.alt).toBe("Alt text");
  });

  test("image with empty alt", () => {
    const md = "![](photo.jpg)";
    const blocks = p.parse(md);
    expect(blocks[0].type).toBe(BlockType.Image);
    expect(blocks[0].metadata?.alt).toBe("");
  });
});

describe("md-parser: tables", () => {
  test("simple table", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Table);
    expect(blocks[0].content).toContain("| A | B |");
  });

  test("table followed by paragraph", () => {
    const md = "| H1 | H2 |\n|---|---|\n| a | b |\n\nAfter table";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe(BlockType.Table);
    expect(blocks[1].type).toBe(BlockType.Paragraph);
  });
});