import { describe, expect, test } from "bun:test";
import { paginateMeasured, sliceParagraph } from "../pagination-engine";
import { breakLines } from "../cjk-line-breaker";
import { BlockType, type SemanticBlock } from "../types";
import type { PaginateContext } from "../pagination-engine";
import { LINE_HEIGHT, BREAK_WIDTH, blockHeight, paragraph } from "./pagination-helpers";

// The real defect: `breakWidthFor` estimates floor(column / fontSize) characters
// per line, but the browser fits more once a line carries Latin words or narrow
// punctuation. makeContext hides this by measuring with the very width it
// reports, so model the drift explicitly: the splitter is told BREAK_WIDTH while
// measurement lays the text out at `realWidth`.
function driftingContext(availableHeight: number, realWidth: number): PaginateContext {
  return {
    availableHeight,
    measure: (blocks) =>
      blocks.reduce((sum, block) => {
        if (block.type !== BlockType.Paragraph) return sum + blockHeight(block);
        const lines = Math.max(1, breakLines(block.content, realWidth).length);
        return sum + lines * LINE_HEIGHT;
      }, 0),
    breakWidthFor: () => BREAK_WIDTH,
  };
}

// BREAK_WIDTH 10 = 5 CJK per estimated line; realWidth 14 = 7 CJK per real line.
const REAL_WIDTH = 14;
const REAL_CHARS_PER_LINE = 7;

describe("跨页切分不留孤字", () => {
  const content = "字".repeat(40);
  const available = 4 * LINE_HEIGHT; // 4 real lines = 28 real chars

  test("切点推进到真实行边界，而不是停在估算行边界", () => {
    const ctx = driftingContext(available, REAL_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    const first = pages[0].blocks[0];

    // 估算行边界会停在 25 字（5 行 × 5 字），渲染出来只占 4 行的前 25 字，
    // 末行只有 4 个字。真实行边界是 28。
    expect(first.content.length).toBe(28);
  });

  test("末行是满的 —— 孤字在构造上不可能出现", () => {
    const ctx = driftingContext(available, REAL_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    const first = pages[0].blocks[0];

    const lines = breakLines(first.content, REAL_WIDTH);
    expect(lines).toHaveLength(4);
    expect(lines[lines.length - 1].text.length).toBe(REAL_CHARS_PER_LINE);
  });

  test("再多切一个安全位置就会溢出，说明已经推到极限", () => {
    const ctx = driftingContext(available, REAL_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    const cut = pages[0].blocks[0].content.length;
    const source = paragraph(content);

    expect(ctx.measure([sliceParagraph(source, 0, cut)])).toBeLessThanOrEqual(available);
    expect(ctx.measure([sliceParagraph(source, 0, cut + 1)])).toBeGreaterThan(available);
  });

  test("推进切点不吞字也不重复", () => {
    const ctx = driftingContext(available, REAL_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    expect(pages.map((p) => p.blocks[0].content).join("")).toBe(content);
  });

  test("片段偏移元数据跟着推进后的切点走", () => {
    const ctx = driftingContext(available, REAL_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    const first = pages[0].blocks[0];
    const second = pages[1].blocks[0];

    expect(first.metadata?.fragmentStart).toBe(0);
    expect(first.metadata?.fragmentEnd).toBe(first.content.length);
    expect(second.metadata?.fragmentStart).toBe(first.content.length);
    expect(second.metadata?.fragmentEnd).toBe(content.length);
  });

  test("估算与实际一致时切点不动，保持原有行为", () => {
    const ctx = driftingContext(available, BREAK_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    // 每行 5 字、预算 4 行 → 20 字，正好落在估算行边界上
    expect(pages[0].blocks[0].content.length).toBe(20);
  });
});

describe("推进切点时不破坏行内 markdown", () => {
  test("窗口里有 ** 就放弃推进，宁可留孤字也不劈开标记", () => {
    // 前 25 字是纯 CJK，推进窗口（25–30）落在 **重点** 里。
    const content = `${"字".repeat(25)}**重点标记**${"字".repeat(20)}`;
    const ctx = driftingContext(4 * LINE_HEIGHT, REAL_WIDTH);
    const pages = paginateMeasured([paragraph(content)], ctx);
    const first = pages[0].blocks[0];

    const stars = (first.content.match(/\*/g) ?? []).length;
    expect(stars % 2).toBe(0);
    expect(first.content).not.toMatch(/\*$/);
  });
});
