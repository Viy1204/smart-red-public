import { breakLines } from "../cjk-line-breaker";
import { BlockType, type SemanticBlock } from "../types";
import type { PaginateContext } from "../pagination-engine";

// Fake measurement model: every line is LINE_HEIGHT px tall, no gaps between
// blocks. Paragraph lines come from the real line breaker so fragments of any
// content stay measurable; other text blocks count newline-separated lines.
export const LINE_HEIGHT = 10;
export const BREAK_WIDTH = 10; // 5 CJK chars per line

export function blockHeight(block: SemanticBlock): number {
  if (block.type === BlockType.Image) {
    const h = block.metadata?.height;
    return typeof h === "number" ? h : 100;
  }
  if (block.type === BlockType.HorizontalRule) return LINE_HEIGHT;
  if (block.type === BlockType.Paragraph) {
    if (block.content.length === 0) return LINE_HEIGHT;
    return breakLines(block.content, BREAK_WIDTH).length * LINE_HEIGHT;
  }
  return Math.max(1, block.content.split("\n").length) * LINE_HEIGHT;
}

export function makeContext(availableHeight: number): PaginateContext {
  return {
    availableHeight,
    measure: (blocks) => blocks.reduce((sum, block) => sum + blockHeight(block), 0),
    breakWidthFor: () => BREAK_WIDTH,
  };
}

export function paragraph(
  content: string,
  metadata?: Record<string, unknown>
): SemanticBlock {
  return {
    type: BlockType.Paragraph,
    content,
    metadata: {
      sourceBlockId: `para-${content.slice(0, 4)}-${content.length}`,
      fragmentStart: 0,
      fragmentEnd: content.length,
      ...metadata,
    },
  };
}

// n lines of 5 CJK chars each under BREAK_WIDTH.
export function cjkLines(n: number, char = "字"): string {
  return char.repeat(n * 5);
}
