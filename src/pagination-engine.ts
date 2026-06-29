import { SemanticBlock, BlockType } from "./types";
import { breakLines, type LineBreak } from "./cjk-line-breaker";

export interface PaginationDecision {
  pageIndex: number;
  blocks: SemanticBlock[];
  hasContinuation: boolean;
  continuationFrom?: number;
}

export interface PaginateContext {
  availableHeight: number;
  // Height of the given blocks laid out together as one page, trailing margin excluded.
  measure(blocks: SemanticBlock[]): number;
  // Width units (CJK char = 2) per line, used to split paragraphs.
  breakWidthFor(block: SemanticBlock): number;
}

// Last page below this fill ratio pulls content back from the previous page,
// as long as the previous page keeps at least PREVIOUS_PAGE_MIN_FILL.
const LAST_PAGE_BALANCE_THRESHOLD = 0.62;
const LAST_PAGE_BALANCE_TARGET = 0.78;
const PREVIOUS_PAGE_MIN_FILL = 0.55;

export function isSameParagraphSource(a: SemanticBlock, b: SemanticBlock): boolean {
  if (a.type !== BlockType.Paragraph || b.type !== BlockType.Paragraph) return false;
  const aSource = a.metadata?.sourceBlockId;
  const bSource = b.metadata?.sourceBlockId;
  return typeof aSource === "string" && aSource.length > 0 && aSource === bSource;
}

export function mergeParagraphFragments(first: SemanticBlock, second: SemanticBlock): SemanticBlock {
  const num = (value: unknown): number | undefined =>
    typeof value === "number" ? value : undefined;
  const firstStart = num(first.metadata?.fragmentStart);
  const secondStart = num(second.metadata?.fragmentStart);
  const firstEnd = num(first.metadata?.fragmentEnd);
  const secondEnd = num(second.metadata?.fragmentEnd);
  const content = `${first.content}${second.content}`;

  return {
    ...first,
    content,
    metadata: {
      ...second.metadata,
      ...first.metadata,
      fragmentStart: Math.min(firstStart ?? secondStart ?? 0, secondStart ?? firstStart ?? 0),
      fragmentEnd: Math.max(
        firstEnd ?? secondEnd ?? content.length,
        secondEnd ?? firstEnd ?? content.length
      ),
    },
  };
}

export function normalizeParagraphFragments(blocks: SemanticBlock[]): SemanticBlock[] {
  const normalized: SemanticBlock[] = [];
  for (const block of blocks) {
    const previous = normalized[normalized.length - 1];
    if (previous && isSameParagraphSource(previous, block)) {
      normalized[normalized.length - 1] = mergeParagraphFragments(previous, block);
    } else {
      normalized.push(block);
    }
  }
  return normalized;
}

export function createParagraphFragment(
  block: SemanticBlock,
  lines: LineBreak[],
  start: number,
  end: number
): SemanticBlock {
  const baseStart = typeof block.metadata?.fragmentStart === "number"
    ? block.metadata.fragmentStart
    : 0;
  const firstLineStart = lines[start]?.start ?? 0;
  const lastLineEnd = lines[end - 1]?.end ?? block.content.length;

  return {
    ...block,
    content: lines.slice(start, end).map((line) => line.text).join(""),
    metadata: {
      ...block.metadata,
      fragmentStart: baseStart + firstLineStart,
      fragmentEnd: baseStart + lastLineEnd,
    },
  };
}

interface SplitResult {
  first: SemanticBlock;
  second: SemanticBlock;
}

function paragraphLines(block: SemanticBlock, ctx: PaginateContext): LineBreak[] {
  const width = Math.max(1, Math.floor(ctx.breakWidthFor(block)));
  return breakLines(block.content, width);
}

// Largest k in [min, max] passing `fits`, or 0 when none does.
function binarySearchMax(
  min: number,
  max: number,
  fits: (k: number) => boolean
): number {
  let low = min;
  let high = max;
  let best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (fits(mid)) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function trySplitParagraph(
  block: SemanticBlock,
  current: SemanticBlock[],
  ctx: PaginateContext
): SplitResult | null {
  const lines = paragraphLines(block, ctx);
  if (lines.length <= 1) return null;

  const best = binarySearchMax(1, lines.length - 1, (k) =>
    ctx.measure([...current, createParagraphFragment(block, lines, 0, k)]) <=
    ctx.availableHeight
  );
  if (best < 1) return null;

  const first = createParagraphFragment(block, lines, 0, best);
  const second = createParagraphFragment(block, lines, best, lines.length);
  if (!first.content.trim() || !second.content.trim()) return null;
  return { first, second };
}

function trySplitCodeBlock(
  block: SemanticBlock,
  current: SemanticBlock[],
  ctx: PaginateContext
): SplitResult | null {
  const codeLines = block.content.split("\n");
  if (codeLines.length < 2) return null;

  const startLineNumber = typeof block.metadata?.startLineNumber === "number"
    ? block.metadata.startLineNumber
    : 1;
  const isContinuation = block.metadata?.isCodeContinuation === true;

  const firstPart = (k: number): SemanticBlock => ({
    ...block,
    content: codeLines.slice(0, k).join("\n"),
    metadata: {
      ...block.metadata,
      isCodeContinuation: isContinuation,
      continuationMarker: isContinuation ? "↩ continued" : undefined,
      startLineNumber,
      endLineNumber: startLineNumber + k - 1,
    },
  });

  const best = binarySearchMax(1, codeLines.length - 1, (k) =>
    ctx.measure([...current, firstPart(k)]) <= ctx.availableHeight
  );
  if (best < 1) return null;

  const second: SemanticBlock = {
    ...block,
    content: codeLines.slice(best).join("\n"),
    metadata: {
      ...block.metadata,
      isCodeContinuation: true,
      continuationMarker: "↩ continued",
      startLineNumber: startLineNumber + best,
    },
  };
  return { first: firstPart(best), second };
}

function listItemLines(block: SemanticBlock): string[][] {
  const lines = block.content.split("\n").filter((line) => line.trim().length > 0);
  const items: string[][] = [];
  for (const line of lines) {
    const isItemStart = /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);
    if (isItemStart || items.length === 0) {
      items.push([line]);
    } else {
      items[items.length - 1].push(line);
    }
  }
  return items;
}

function trySplitList(
  block: SemanticBlock,
  current: SemanticBlock[],
  ctx: PaginateContext
): SplitResult | null {
  if (block.children && block.children.length >= 2) {
    const children = block.children;
    const firstPart = (k: number): SemanticBlock => ({
      ...block,
      content: children.slice(0, k).map((c) => c.content).join("\n"),
      children: children.slice(0, k),
    });
    const best = binarySearchMax(1, children.length - 1, (k) =>
      ctx.measure([...current, firstPart(k)]) <= ctx.availableHeight
    );
    if (best < 1) return null;
    return {
      first: firstPart(best),
      second: {
        ...block,
        content: children.slice(best).map((c) => c.content).join("\n"),
        children: children.slice(best),
      },
    };
  }

  const items = listItemLines(block);
  if (items.length < 2) return null;
  const firstPart = (k: number): SemanticBlock => ({
    ...block,
    content: items.slice(0, k).map((item) => item.join("\n")).join("\n"),
  });
  const best = binarySearchMax(1, items.length - 1, (k) =>
    ctx.measure([...current, firstPart(k)]) <= ctx.availableHeight
  );
  if (best < 1) return null;
  return {
    first: firstPart(best),
    second: {
      ...block,
      content: items.slice(best).map((item) => item.join("\n")).join("\n"),
    },
  };
}

function trySplitBlockquote(
  block: SemanticBlock,
  current: SemanticBlock[],
  ctx: PaginateContext
): SplitResult | null {
  if (!block.children || block.children.length < 2) return null;
  const children = block.children;
  const firstPart = (k: number): SemanticBlock => ({
    ...block,
    content: children.slice(0, k).map((c) => c.content).join("\n\n"),
    children: children.slice(0, k),
  });
  const best = binarySearchMax(1, children.length - 1, (k) =>
    ctx.measure([...current, firstPart(k)]) <= ctx.availableHeight
  );
  if (best < 1) return null;
  return {
    first: firstPart(best),
    second: {
      ...block,
      content: children.slice(best).map((c) => c.content).join("\n\n"),
      children: children.slice(best),
    },
  };
}

function trySplitBlock(
  block: SemanticBlock,
  current: SemanticBlock[],
  ctx: PaginateContext
): SplitResult | null {
  switch (block.type) {
    case BlockType.Paragraph:
      return trySplitParagraph(block, current, ctx);
    case BlockType.CodeBlock:
      return trySplitCodeBlock(block, current, ctx);
    case BlockType.List:
      return trySplitList(block, current, ctx);
    case BlockType.Blockquote:
      return trySplitBlockquote(block, current, ctx);
    default:
      return null;
  }
}

// True when placing the heading at the bottom of the current page would leave
// it stranded without at least a couple of lines of its following content.
function headingShouldBreakPage(
  heading: SemanticBlock,
  follower: SemanticBlock | undefined,
  current: SemanticBlock[],
  ctx: PaginateContext
): boolean {
  if (current.length === 0) return false;
  const withHeading = [...current, heading];
  if (ctx.measure(withHeading) > ctx.availableHeight) return true;
  if (!follower) return false;

  let probe = follower;
  if (follower.type === BlockType.Paragraph) {
    const lines = paragraphLines(follower, ctx);
    if (lines.length > 2) {
      probe = createParagraphFragment(follower, lines, 0, 2);
    }
  } else if (ctx.measure([follower]) > ctx.availableHeight) {
    // Follower never fits on any page; only require the heading itself to fit.
    return false;
  }
  return ctx.measure([...withHeading, probe]) > ctx.availableHeight;
}

function balanceLastPage(
  pages: SemanticBlock[][],
  ctx: PaginateContext,
  explicitBreakAfter: Set<number>
): void {
  if (pages.length < 2) return;
  // Never pull content across a break the author placed with `---`.
  if (explicitBreakAfter.has(pages.length - 2)) return;
  // A last page opening with its own section heading is a deliberate closing
  // card; stealing unrelated content from the previous page to fatten it
  // hurts more than the short page does.
  if (pages[pages.length - 1][0]?.type === BlockType.Heading) return;
  const availableHeight = ctx.availableHeight;
  const last = pages[pages.length - 1];
  const previous = pages[pages.length - 2];

  if (ctx.measure(last) >= availableHeight * LAST_PAGE_BALANCE_THRESHOLD) return;

  let iterations = 0;
  while (
    iterations < 12 &&
    ctx.measure(last) < availableHeight * LAST_PAGE_BALANCE_TARGET
  ) {
    iterations++;
    if (moveTrailingBlockToLastPage(previous, last, ctx)) continue;
    if (moveParagraphSuffixToLastPage(previous, last, ctx)) continue;
    break;
  }

  if (previous.length === 0) {
    pages.splice(pages.length - 2, 1);
  }
}

function prependToPage(block: SemanticBlock, page: SemanticBlock[]): SemanticBlock[] {
  const [first, ...rest] = page;
  if (first && isSameParagraphSource(block, first)) {
    return [mergeParagraphFragments(block, first), ...rest];
  }
  return [block, ...page];
}

function moveTrailingBlockToLastPage(
  previous: SemanticBlock[],
  last: SemanticBlock[],
  ctx: PaginateContext
): boolean {
  if (previous.length <= 1) return false;
  const moving = previous[previous.length - 1];
  if (
    moving.type === BlockType.Heading ||
    moving.type === BlockType.HorizontalRule ||
    moving.type === BlockType.Spacer
  ) {
    return false;
  }

  const remaining = previous.slice(0, -1);
  // Moving this block must not strand a heading at the previous page bottom.
  if (remaining[remaining.length - 1]?.type === BlockType.Heading) return false;

  const candidate = prependToPage(moving, last);
  const remainingHeight = ctx.measure(remaining);
  const candidateHeight = ctx.measure(candidate);
  if (remainingHeight < ctx.availableHeight * PREVIOUS_PAGE_MIN_FILL) return false;
  // Balancing evens pages out; never leave the previous page emptier than the last.
  if (remainingHeight < candidateHeight) return false;
  if (candidateHeight > ctx.availableHeight) return false;

  previous.length = 0;
  previous.push(...remaining);
  last.length = 0;
  last.push(...candidate);
  return true;
}

function moveParagraphSuffixToLastPage(
  previous: SemanticBlock[],
  last: SemanticBlock[],
  ctx: PaginateContext
): boolean {
  const trailing = previous[previous.length - 1];
  if (!trailing || trailing.type !== BlockType.Paragraph) return false;
  const leadingLast = last[0];
  if (!leadingLast || !isSameParagraphSource(trailing, leadingLast)) return false;

  const lines = paragraphLines(trailing, ctx);
  if (lines.length <= 1) return false;

  let best: { previous: SemanticBlock[]; last: SemanticBlock[] } | null = null;
  for (let suffixLines = 1; suffixLines < lines.length; suffixLines++) {
    const splitIndex = lines.length - suffixLines;
    const kept = createParagraphFragment(trailing, lines, 0, splitIndex);
    const moved = createParagraphFragment(trailing, lines, splitIndex, lines.length);
    if (!kept.content.trim() || !moved.content.trim()) continue;

    const previousCandidate = [...previous.slice(0, -1), kept];
    const lastCandidate = prependToPage(moved, last);
    const previousHeight = ctx.measure(previousCandidate);
    const lastHeight = ctx.measure(lastCandidate);
    if (previousHeight < ctx.availableHeight * PREVIOUS_PAGE_MIN_FILL) break;
    if (previousHeight < lastHeight) break;
    if (lastHeight > ctx.availableHeight) break;
    best = { previous: previousCandidate, last: lastCandidate };
  }

  if (!best) return false;
  previous.length = 0;
  previous.push(...best.previous);
  last.length = 0;
  last.push(...best.last);
  return true;
}

export function paginateMeasured(
  blocks: SemanticBlock[],
  ctx: PaginateContext
): PaginationDecision[] {
  if (blocks.length === 0 || ctx.availableHeight <= 0) return [];

  const queue = [...blocks];
  const pages: SemanticBlock[][] = [];
  const explicitBreakAfter = new Set<number>();
  let current: SemanticBlock[] = [];

  const fits = (candidate: SemanticBlock[]) =>
    ctx.measure(candidate) <= ctx.availableHeight;
  const closePage = () => {
    if (current.length > 0) {
      pages.push(normalizeParagraphFragments(current));
      current = [];
    }
  };

  while (queue.length > 0) {
    const block = queue.shift() as SemanticBlock;

    if (block.type === BlockType.HorizontalRule) {
      // `---` means "start the next card here"; the rule itself is not rendered.
      closePage();
      if (pages.length > 0) {
        explicitBreakAfter.add(pages.length - 1);
      }
      continue;
    }

    if (block.type === BlockType.Spacer) {
      // Whitespace is invisible at page boundaries: it never opens a page,
      // and one that does not fit at the bottom is dropped with the break.
      if (current.length === 0) continue;
      if (fits([...current, block])) {
        current.push(block);
      } else {
        closePage();
      }
      continue;
    }

    if (
      block.type === BlockType.Heading &&
      headingShouldBreakPage(block, queue[0], current, ctx)
    ) {
      closePage();
      queue.unshift(block);
      continue;
    }

    if (fits([...current, block])) {
      current.push(block);
      continue;
    }

    const split = trySplitBlock(block, current, ctx);
    if (split) {
      current.push(split.first);
      closePage();
      queue.unshift(split.second);
      continue;
    }

    if (current.length > 0) {
      closePage();
      queue.unshift(block);
      continue;
    }

    // Alone on an empty page and unsplittable: emit as its own page; the card
    // clips the overflow.
    current.push(block);
    closePage();
  }
  closePage();

  // Trailing whitespace right before a page break is invisible; drop it.
  for (const page of pages) {
    while (page.length > 1 && page[page.length - 1].type === BlockType.Spacer) {
      page.pop();
    }
  }

  balanceLastPage(pages, ctx, explicitBreakAfter);

  return pages.map((pageBlocks, index) => ({
    pageIndex: index,
    blocks: pageBlocks,
    hasContinuation: index < pages.length - 1,
    continuationFrom: index > 0 ? index - 1 : undefined,
  }));
}
