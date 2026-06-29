import { Rules, Break } from "@cto.af/linebreak";

export interface LineBreak {
  start: number;
  end: number;
  text: string;
  width: number;
}

const KINSOKU_START_PROHIBITED = new Set([
  "。", "、", "！", "？", "）", "」", "』", "\"", "\"", "\"", "\"", "'", "'", "”", "’",
  ",", ".", "!", "?", ")", "]", "}", ":", ";",
]);

const KINSOKU_END_PROHIBITED = new Set([
  "（", "「", "『", "\"", "\"", "\"", "\"", "《", "〈", "【", "[", "{",
]);

function isCJK(char: string): boolean {
  const cp = char.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x20000 && cp <= 0x2a6df) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    (cp >= 0x3040 && cp <= 0x309f) ||
    (cp >= 0x30a0 && cp <= 0x30ff) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0x3130 && cp <= 0x318f)
  );
}

function charWidth(char: string): number {
  if (char.length === 0) return 0;
  const cp = char.codePointAt(0) ?? 0;
  if (cp >= 0xff01 && cp <= 0xff5e) return 2;
  if (cp >= 0xff65 && cp <= 0xff9f) return 1;
  if (isCJK(char)) return 2;
  if (cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0xfeff) return 0;
  return 1;
}

function stringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    width += charWidth(char);
  }
  return width;
}

const URL_RE =
  /^(https?:\/\/|www\.)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/;

function isUrlStart(text: string, pos: number): boolean {
  const slice = text.slice(pos);
  return URL_RE.test(slice);
}

function isDigit(char: string): boolean {
  return /\d/.test(char);
}

export function breakLines(
  text: string,
  width: number,
  _font?: string
): LineBreak[] {
  if (width <= 0) {
    throw new Error("Width must be greater than 0");
  }
  if (text.length === 0) {
    return [];
  }

  const rules = new Rules();
  const breaks: Break[] = [];
  for (const brk of rules.breaks(text)) {
    breaks.push(brk);
  }

  const breakPositions: number[] = [];

  let lineStart = 0;
  let lineWidth = 0;
  let lastSafeBreak = -1;
  let breakIndex = 0;

  for (let i = 0; i < text.length; ) {
    const char = text[i];
    const cw = charWidth(char);

    if (lineWidth + cw > width) {
      let breakPos: number;

      if (lastSafeBreak > lineStart) {
        breakPos = lastSafeBreak;
      } else if (lineWidth === 0) {
        // Single char wider than container: force it onto its own line
        breakPos = i + char.length;
      } else {
        breakPos = i;
      }

      breakPositions.push(breakPos);
      lineStart = breakPos;
      lineWidth = stringWidth(text.slice(lineStart, i));
      lastSafeBreak = -1;
      continue;
    }

    lineWidth += cw;

    const opportunity = breaks[breakIndex];
    if (opportunity && opportunity.position === i + char.length) {
      const pos = opportunity.position;
      const nextChar = text[pos];

      const startOk = !nextChar || !KINSOKU_START_PROHIBITED.has(nextChar);
      const endOk = !KINSOKU_END_PROHIBITED.has(char);

      const inUrl = isUrlStart(text, lineStart) && pos < text.length && !/\s/.test(text[pos] ?? " ");
      const urlOk = !inUrl;

      const nextIsDigit = isDigit(nextChar ?? "");
      const currIsDigit = isDigit(char);
      const numberOk = !(currIsDigit && nextIsDigit);

      if (startOk && endOk && urlOk && numberOk) {
        lastSafeBreak = pos;
      }

      breakIndex++;
    }

    i += char.length;
  }

  const lines: LineBreak[] = [];
  let start = 0;
  for (const end of breakPositions) {
    const lineText = text.slice(start, end);
    lines.push({
      start,
      end,
      text: lineText,
      width: stringWidth(lineText),
    });
    start = end;
  }
  if (start < text.length) {
    const lineText = text.slice(start);
    lines.push({
      start,
      end: text.length,
      text: lineText,
      width: stringWidth(lineText),
    });
  }

  return lines;
}

export function getBreakOpportunities(text: string): number[] {
  const rules = new Rules();
  const positions: number[] = [];
  for (const brk of rules.breaks(text)) {
    positions.push(brk.position);
  }
  return positions;
}

export function isProhibitedAtStart(char: string): boolean {
  return KINSOKU_START_PROHIBITED.has(char);
}

export function isProhibitedAtEnd(char: string): boolean {
  return KINSOKU_END_PROHIBITED.has(char);
}
