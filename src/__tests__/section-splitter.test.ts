import { describe, expect, test } from "bun:test";
import { buildRenderSegments } from "../section-splitter";
import { BlockType, type SemanticBlock } from "../types";

function block(type: BlockType, content: string, metadata?: Record<string, unknown>): SemanticBlock {
  return { type, content, metadata };
}

describe("buildRenderSegments", () => {
  test("returns no segments for empty input", () => {
    expect(buildRenderSegments([])).toEqual([]);
  });

  test("keeps all content in one continuous pagination flow", () => {
    const blocks = [
      block(BlockType.Heading, "One", { level: 2 }),
      block(BlockType.Paragraph, "A"),
      block(BlockType.HorizontalRule, ""),
      block(BlockType.Heading, "Two", { level: 2 }),
      block(BlockType.Paragraph, "B"),
    ];

    const segments = buildRenderSegments(blocks);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toBe(blocks);
  });
});
