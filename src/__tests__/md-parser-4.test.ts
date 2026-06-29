import { test, expect, describe } from "bun:test";
import { MarkdownParser } from "../markdown-parser";
import { BlockType } from "../types";

const p = new MarkdownParser();

describe("md-parser: unsupported syntax stripping", () => {
  test("strip frontmatter", () => {
    const md = "---\ntitle: Test\ndate: 2024-01-01\n---\n\nContent here";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("Content here");
  });

  test("strip callouts entirely", () => {
    const md = "> [!note] Title\n> Some content\n> More content";
    const blocks = p.parse(md);
    expect(blocks.every(b => b.type !== BlockType.Blockquote)).toBe(true);
    expect(blocks.every(b => !b.content.includes("[!note]"))).toBe(true);
  });

  test("strip callout with no body", () => {
    const md = "> [!warning]\n\nParagraph after";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("Paragraph after");
  });

  test("strip embeds", () => {
    const md = "See ![[image.png]] for details";
    const blocks = p.parse(md);
    expect(blocks[0].content).not.toContain("![[image.png]]");
  });

  test("strip mermaid blocks", () => {
    const md = "```mermaid\ngraph TD\n  A-->B\n```\n\nText after";
    const blocks = p.parse(md);
    expect(blocks.every(b => b.type !== BlockType.CodeBlock || b.metadata?.language !== 'mermaid')).toBe(true);
    expect(blocks.some(b => b.type === BlockType.Paragraph)).toBe(true);
  });

  test("strip math blocks", () => {
    const md = "Before $$E=mc^2$$ After";
    const blocks = p.parse(md);
    expect(blocks[0].content).not.toContain("$$");
  });

  test("preserve wikilinks for template rendering", () => {
    const md = "See [[Page Name]] for details";
    const blocks = p.parse(md);
    expect(blocks[0].content).toContain("[[Page Name]]");
  });

  test("wikilink with display text", () => {
    const md = "[[Page|Display Text]]";
    const blocks = p.parse(md);
    expect(blocks[0].content).toContain("[[Page|Display Text]]");
  });

  test("wikilink with heading", () => {
    const md = "[[Page#Section]]";
    const blocks = p.parse(md);
    expect(blocks[0].content).toContain("[[Page#Section]]");
  });
});

describe("md-parser: mixed content", () => {
  test("full document with multiple block types", () => {
    const md = `---
title: Test
---

# Main Title

A paragraph with **bold** and [[link]].

\`\`\`python
print("hello")
\`\`\`

- Item 1
- Item 2

> A quote

---

![Photo](img.png)`;

    const blocks = p.parse(md);
    expect(blocks.some(b => b.type === BlockType.Heading)).toBe(true);
    expect(blocks.some(b => b.type === BlockType.Paragraph)).toBe(true);
    expect(blocks.some(b => b.type === BlockType.CodeBlock)).toBe(true);
    expect(blocks.some(b => b.type === BlockType.List)).toBe(true);
    expect(blocks.some(b => b.type === BlockType.Blockquote)).toBe(true);
    expect(blocks.some(b => b.type === BlockType.HorizontalRule)).toBe(true);
    expect(blocks.some(b => b.type === BlockType.Image)).toBe(true);
  });

  test("CJK mixed content in paragraph", () => {
    const md = "这是中文段落，with English mixed in。还有更多内容。";
    const blocks = p.parse(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toContain("中文");
  });
});

describe("blank line spacers", () => {
  test("a single blank line is just a paragraph break", () => {
    const blocks = p.parse("第一段\n\n第二段");
    expect(blocks.map((b) => b.type)).toEqual([BlockType.Paragraph, BlockType.Paragraph]);
  });

  test("two blank lines insert one extra gap", () => {
    const blocks = p.parse("第一段\n\n\n第二段");
    expect(blocks.map((b) => b.type)).toEqual([
      BlockType.Paragraph,
      BlockType.Spacer,
      BlockType.Paragraph,
    ]);
    expect(blocks[1].metadata?.gaps).toBe(1);
  });

  test("four blank lines insert three extra gaps", () => {
    const blocks = p.parse("第一段\n\n\n\n\n第二段");
    expect(blocks[1].type).toBe(BlockType.Spacer);
    expect(blocks[1].metadata?.gaps).toBe(3);
  });

  test("blank lines at the start or end of the note add no spacer", () => {
    const blocks = p.parse("\n\n\n只有一段\n\n\n");
    expect(blocks.map((b) => b.type)).toEqual([BlockType.Paragraph]);
  });
});

describe("wiki-style image embeds", () => {
  test("![[file.png]] becomes an image block", () => {
    const blocks = p.parse("![[Pasted image 20260610001422.png]]");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Image);
    expect(blocks[0].content).toBe("Pasted image 20260610001422.png");
  });

  test("![[file.jpg|alt]] keeps the alt text", () => {
    const blocks = p.parse("![[photo.jpg|示意图]]");
    expect(blocks[0].type).toBe(BlockType.Image);
    expect(blocks[0].metadata?.alt).toBe("示意图");
  });

  test("non-image embeds are still stripped", () => {
    const blocks = p.parse("前文\n\n![[某篇笔记]]\n\n后文");
    expect(blocks.map((b) => b.type)).toEqual([BlockType.Paragraph, BlockType.Paragraph]);
  });

  test("uppercase extensions are recognized", () => {
    const blocks = p.parse("![[Screenshot.PNG]]");
    expect(blocks[0].type).toBe(BlockType.Image);
  });
});
