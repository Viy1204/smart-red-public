import "./dom-setup";
import { describe, expect, test } from "bun:test";
import { stripTitleHeading } from "../view";
import { BlockType, type SemanticBlock } from "../types";

const h1 = (content: string): SemanticBlock => ({
  type: BlockType.Heading,
  content,
  metadata: { level: 1 },
});
const h2 = (content: string): SemanticBlock => ({
  type: BlockType.Heading,
  content,
  metadata: { level: 2 },
});
const p = (content: string): SemanticBlock => ({ type: BlockType.Paragraph, content });

describe("stripTitleHeading", () => {
  test("drops the leading title H1", () => {
    const blocks = [h1("标题"), p("正文一"), p("正文二")];
    expect(stripTitleHeading(blocks).map((b) => b.content)).toEqual(["正文一", "正文二"]);
  });

  // extractDocumentTitle 用 find 而不是看 blocks[0]，所以摘除也必须按命中位置来，
  // 否则会把前置段落误删。
  test("drops the H1 wherever it sits, not blocks[0]", () => {
    const blocks = [p("引子"), h1("标题"), p("正文")];
    expect(stripTitleHeading(blocks).map((b) => b.content)).toEqual(["引子", "正文"]);
  });

  test("leaves blocks untouched when there is no H1", () => {
    const blocks = [h2("小标题"), p("正文")];
    expect(stripTitleHeading(blocks)).toEqual(blocks);
  });

  test("ignores a blank H1 so the filename stays the title", () => {
    const blocks = [h1("   "), p("正文")];
    expect(stripTitleHeading(blocks)).toEqual(blocks);
  });

  test("only the first H1 goes; later ones are real section headings", () => {
    const blocks = [h1("标题"), p("正文"), h1("第二章")];
    expect(stripTitleHeading(blocks).map((b) => b.content)).toEqual(["正文", "第二章"]);
  });
});
