import "./dom-setup";
import { describe, expect, test } from "bun:test";
import { BlockType } from "../types";
import {
  renderBlock,
  renderInlineMarkdown,
  renderList,
  renderTable,
  stripInlineMarkdown,
} from "../templates/utils";

describe("template inline Markdown rendering", () => {
  test("renders emphasis, code, strikethrough, links, bare URLs and wikilinks", () => {
    const html = renderInlineMarkdown(
      "这是 **重点**、*语气*、`code`、~~删除~~、[链接](https://example.com/a) 和 [[页面|别名]] https://openai.com"
    );

    expect(html).toContain("<strong>重点</strong>");
    expect(html).toContain("<em>语气</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<del>删除</del>");
    expect(html).toContain('<a href="https://example.com/a">链接</a>');
    expect(html).toContain('<span class="wikilink">别名</span>');
    expect(html).toContain('<a href="https://openai.com">openai.com</a>');
  });

  test("renders empty-label Markdown links without exposing raw syntax", () => {
    const html = renderInlineMarkdown("[](https://mp.weixin.qq.com/s/demo)");

    expect(html).toContain('<a href="https://mp.weixin.qq.com/s/demo">mp.weixin.qq.com/s/demo</a>');
    expect(html).not.toContain("](");
  });

  test("link labels with special characters are escaped exactly once", () => {
    const html = renderInlineMarkdown("[A & B](https://x.com) 以及 [x < y](https://y.com)");

    expect(html).toContain('<a href="https://x.com">A &amp; B</a>');
    expect(html).not.toContain("&amp;amp;");
    expect(html).toContain('<a href="https://y.com">x &lt; y</a>');
    expect(html).not.toContain("&amp;lt;");
  });

  test("link labels still render emphasis", () => {
    const html = renderInlineMarkdown("[**重点** 链接](https://x.com)");

    expect(html).toContain('<a href="https://x.com"><strong>重点</strong> 链接</a>');
  });

  test("strips inline Markdown for chrome titles", () => {
    expect(stripInlineMarkdown("**真正的文章标题**")).toBe("真正的文章标题");
    expect(stripInlineMarkdown("[[页面#段落|显示标题]]")).toBe("显示标题");
  });
});

describe("template block rendering", () => {
  test("renders task lists as checkbox items", () => {
    const html = renderList("- [ ] 待办\n- [x] 完成");

    expect(html).toContain("task-item");
    expect(html).toContain("is-checked");
    expect(html).toContain("task-box");
  });

  test("renders table cells with inline Markdown", () => {
    const html = renderTable("| A | B |\n|---|---|\n| **x** | [y](https://y.test) |");

    expect(html).toContain("<table>");
    expect(html).toContain("<strong>x</strong>");
    expect(html).toContain('<a href="https://y.test">y</a>');
  });

  test("renders code blocks with language and line numbers", () => {
    const html = renderBlock({
      type: BlockType.CodeBlock,
      content: "const x = 1;",
      metadata: { language: "ts", startLineNumber: 7 },
    });

    expect(html).toContain("<figcaption>TS</figcaption>");
    expect(html).toContain('<span class="line-num">7</span>');
    expect(html).toContain("const x = 1;");
  });

  test("paragraph rendering only turns explicit hard breaks into br tags", () => {
    const soft = renderBlock({
      type: BlockType.Paragraph,
      content: "从A+掉到A,你会怎么想",
    });
    const hard = renderBlock({
      type: BlockType.Paragraph,
      content: "第一行\n第二行",
    });

    expect(soft).not.toContain("<br");
    expect(hard).toContain("<br />");
  });
});

describe("spacer rendering", () => {
  test("a spacer renders as an empty div sized in paragraph gaps", () => {
    const html = renderBlock({ type: BlockType.Spacer, content: "", metadata: { gaps: 2 } });
    expect(html).toBe(`<div class="md-spacer" style="height: calc(2 * var(--para-gap))"></div>`);
  });
});
