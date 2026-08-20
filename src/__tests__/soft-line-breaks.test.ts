import "./dom-setup";
import { describe, expect, test } from "bun:test";
import { MarkdownParser } from "../markdown-parser";
import { BlockType } from "../types";

const parse = (md: string, softLineBreaks?: boolean) =>
  new MarkdownParser().parse(md, softLineBreaks === undefined ? undefined : { softLineBreaks });

describe("单换行的处理", () => {
  const md = "你会不会留他？\n不会";

  // Obsidian 默认 "Strict line breaks" 是关的，编辑器里单换行就是换行。
  // 之前只走 CommonMark 语义，导致编辑器和导出图不一致。
  test("开启时单换行保留为换行", () => {
    const blocks = parse(md, true);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe(BlockType.Paragraph);
    expect(blocks[0].content).toBe("你会不会留他？\n不会");
  });

  test("关闭时折成一行，走 CommonMark", () => {
    const blocks = parse(md, false);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe("你会不会留他？不会");
  });

  test("默认（不传选项）保持 CommonMark，不影响直接调用 parse 的老路径", () => {
    expect(parse(md)[0].content).toBe("你会不会留他？不会");
  });

  test("两个尾随空格的硬换行在两种模式下都成立", () => {
    const hard = "第一行  \n第二行";
    expect(parse(hard, false)[0].content).toBe("第一行\n第二行");
    expect(parse(hard, true)[0].content).toBe("第一行\n第二行");
  });

  test("空行仍然是段落分隔，不受影响", () => {
    const blocks = parse("第一段\n\n第二段", true);
    expect(blocks.map((b) => b.content)).toEqual(["第一段", "第二段"]);
  });

  test("中英之间的软换行在关闭时补空格，开启时换行", () => {
    const md2 = "用 Claude Code\n重新做一遍";
    expect(parse(md2, false)[0].content).toBe("用 Claude Code 重新做一遍");
    expect(parse(md2, true)[0].content).toBe("用 Claude Code\n重新做一遍");
  });
});
