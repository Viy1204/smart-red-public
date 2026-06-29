import type { SemanticBlock } from "./types";

// The whole note flows through pagination as one continuous segment;
// horizontal rules render as separators instead of forcing page breaks.
export function buildRenderSegments(blocks: SemanticBlock[]): SemanticBlock[][] {
  return blocks.length > 0 ? [blocks] : [];
}
