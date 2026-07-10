import { sanitizeHTMLToDom } from "obsidian";
import { BlockType, type SemanticBlock } from "../types";
import type { PaginationDecision } from "../pagination-engine";
import type { CoverRenderContext, TemplateRenderContext } from "./types";

export type TemplateId =
  | "editorial"
  | "monochrome"
  | "neo-grid"
  | "warm-zine"
  | "warm-sun"
  | "memo"
  | "noir-magazine"
  | "ivory-essay"
  | "red-ledger"
  | "slate-journal"
  | "pearl-magazine"
  | "ink-report"
  | "claude"
  | "minimax"
  | "xai"
  | "lovable"
  | "notion"
  | "figma"
  | "apple"
  | "the-verge"
  | "wired";

export interface TemplateChrome {
  eyebrow: string;
  volume: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Input must already be HTML-escaped; applies emphasis markers without re-escaping.
function applyEmphasis(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

export function renderInlineMarkdown(text: string): string {
  const tokens: string[] = [];
  const stash = (html: string) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };

  let safe = escapeHtml(text);

  safe = safe.replace(/`([^`]+)`/g, (_m, code: string) =>
    stash(`<code>${code}</code>`)
  );
  safe = safe.replace(/\[\[([^\]]+)\]\]/g, (_m, raw: string) => {
    const display = raw.includes("|") ? raw.split("|").slice(1).join("|") : raw;
    return stash(`<span class="wikilink">${escapeHtml(display.replace("#", " / "))}</span>`);
  });
  safe = safe.replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+|[^)\s]+)\)/g, (_m, label: string, url: string) => {
    // label and url come from `safe`, so they are escaped already.
    const cleanLabel = label.trim() || url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return stash(`<a href="${url}">${applyEmphasis(cleanLabel)}</a>`);
  });
  safe = safe.replace(/(https?:\/\/[^\s<]+)/g, (_m, url: string) => {
    const label = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return stash(`<a href="${url}">${label}</a>`);
  });
  safe = applyEmphasis(safe);

  return safe.replace(/\u0000(\d+)\u0000/g, (_m, idx: string) => tokens[Number(idx)] ?? "");
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_m, page: string, alias: string) => alias || page)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/[_#>]/g, "")
    .trim();
}

export function renderList(raw: string): string {
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  const ordered = lines.some((line) => /^\s*\d+\.\s/.test(line));
  const tag = ordered ? "ol" : "ul";
  const items = lines.map((line) => {
    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (task) {
      const checked = task[1].toLowerCase() === "x";
      return `<li class="task-item ${checked ? "is-checked" : ""}"><span class="task-box">${checked ? "✓" : ""}</span><span>${renderInlineMarkdown(task[2])}</span></li>`;
    }
    const clean = line.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, "");
    return `<li>${renderInlineMarkdown(clean)}</li>`;
  });
  return `<${tag}>${items.join("")}</${tag}>`;
}

export function renderTable(raw: string): string {
  const rows = raw.split("\n").filter((row) => row.trim().length > 0);
  if (rows.length === 0) return "";

  const parseRow = (row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, arr) => cell.length > 0 || (index > 0 && index < arr.length - 1));

  const headers = parseRow(rows[0]);
  const bodyRows = rows.slice(1).filter((row) => !/^[\s|:-]+$/.test(row)).map(parseRow);

  return [
    "<table><thead><tr>",
    headers.map((header) => `<th>${renderInlineMarkdown(header)}</th>`).join(""),
    "</tr></thead><tbody>",
    bodyRows
      .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`)
      .join(""),
    "</tbody></table>",
  ].join("");
}

export function renderCodeBlock(block: SemanticBlock): string {
  const language = ((block.metadata?.language as string | undefined) || "text").toUpperCase();
  const startLine = (block.metadata?.startLineNumber as number | undefined) || 1;
  const rows = block.content.split("\n").map((line, index) =>
    `<span class="code-line"><span class="line-num">${startLine + index}</span><span class="code-text">${escapeHtml(line) || " "}</span></span>`
  );
  return `<figure class="code-block"><figcaption>${escapeHtml(language)}</figcaption><pre>${rows.join("")}</pre></figure>`;
}

export function renderBlock(block: SemanticBlock): string {
  switch (block.type) {
    case BlockType.Heading: {
      const level = Math.min(Math.max((block.metadata?.level as number) || 2, 1), 6);
      return `<h${level}>${renderInlineMarkdown(block.content)}</h${level}>`;
    }
    case BlockType.Paragraph:
      return `<p>${renderInlineMarkdown(block.content).replace(/\n/g, "<br />")}</p>`;
    case BlockType.CodeBlock:
      return renderCodeBlock(block);
    case BlockType.Blockquote:
      return `<blockquote>${renderInlineMarkdown(block.content).replace(/\n/g, "<br />")}</blockquote>`;
    case BlockType.List:
      return renderList(block.content);
    case BlockType.HorizontalRule:
      return `<hr />`;
    case BlockType.Spacer: {
      const gaps = typeof block.metadata?.gaps === "number" ? Math.max(1, block.metadata.gaps) : 1;
      return `<div class="md-spacer" style="height: calc(${gaps} * var(--para-gap))"></div>`;
    }
    case BlockType.Image: {
      const alt = (block.metadata?.alt as string | undefined) || "";
      const naturalWidth = block.metadata?.naturalWidth;
      const naturalHeight = block.metadata?.naturalHeight;
      let imgAttrs = "";
      if (typeof naturalWidth === "number" && typeof naturalHeight === "number") {
        // Intrinsic dimensions keep layout (and height measurement) correct
        // even before the image finishes decoding; the width cap scales tall
        // images down to the height limit while preserving aspect ratio, so
        // the full image is always visible.
        const widthAtMaxHeight = Math.round((960 * naturalWidth) / naturalHeight);
        imgAttrs =
          ` width="${Math.round(naturalWidth)}" height="${Math.round(naturalHeight)}"` +
          ` style="width: min(100%, ${widthAtMaxHeight}px); height: auto;"`;
      }
      const caption = alt ? `<figcaption>${renderInlineMarkdown(alt)}</figcaption>` : "";
      return `<figure class="image-block"><img src="${escapeHtml(block.content)}" alt="${escapeHtml(alt)}"${imgAttrs} />${caption}</figure>`;
    }
    case BlockType.Table:
      return renderTable(block.content);
    default:
      return `<p>${renderInlineMarkdown(block.content)}</p>`;
  }
}

export function renderBlocks(blocks: SemanticBlock[]): string {
  return blocks.map(renderBlock).join("");
}

const VERIFIED_BADGE_SVG = `<svg class="verified-badge" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#1d9bf0"></circle><path d="M8.8 12.4l2.2 2.2 4.3-4.8" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function renderProfileHeader(chrome: TemplateChrome, context?: TemplateRenderContext): string {
  const user = context?.user;
  const avatar = (user?.avatar || "").trim();
  const nickname = (user?.nickname || "").trim();
  const handle = (user?.handle || "").trim().replace(/^@+/, "");
  const subtitle = (user?.subtitle || "").trim();
  const sectionTitle = (context?.sectionTitle || chrome.volume).trim();
  const roundAvatar = user?.roundAvatar !== false;
  const badge = user?.verifiedBadge === true && nickname ? VERIFIED_BADGE_SVG : "";
  if (!avatar && !nickname && !handle && !subtitle) {
    return `
      <span>${escapeHtml(chrome.eyebrow)}</span>
      <span class="article-title-chrome">${escapeHtml(sectionTitle)}</span>
    `;
  }

  return `
    <span class="profile-chrome">
      ${avatar ? `<img class="profile-avatar ${roundAvatar ? "is-round" : ""}" src="${escapeHtml(avatar)}" alt="${escapeHtml(nickname || "avatar")}" />` : ""}
      <span class="profile-copy">
        ${nickname ? `<span class="profile-nameline"><span class="profile-name">${escapeHtml(nickname)}</span>${badge}</span>` : ""}
        ${handle ? `<span class="profile-handle">@${escapeHtml(handle)}</span>` : ""}
        ${subtitle ? `<span class="profile-subtitle">${escapeHtml(subtitle)}</span>` : ""}
      </span>
    </span>
    <span class="article-title-chrome">${escapeHtml(sectionTitle)}</span>
  `;
}

export type ChromeTopRenderer = (
  page: PaginationDecision,
  context?: TemplateRenderContext
) => string;

export function renderChrome(
  page: PaginationDecision,
  chrome: TemplateChrome,
  context?: TemplateRenderContext,
  renderTop?: ChromeTopRenderer
): string {
  const pageNo = String(page.pageIndex + 1).padStart(2, "0");
  const user = context?.user;
  const showHeader = user?.showHeader !== false;
  const showFooter = user?.showFooter !== false;
  const footer = (user?.footer || "").trim();
  return `
    ${showHeader ? `
    <div class="card-chrome top">
      ${renderTop ? renderTop(page, context) : renderProfileHeader(chrome, context)}
    </div>
    ` : ""}
    ${showFooter ? `
    <div class="card-chrome bottom">
      <span>${escapeHtml(footer)}</span>
      ${page.hasContinuation ? `<span class="continuation-hint">继续阅读 / next card</span>` : `<span></span>`}
      <span>${pageNo}</span>
    </div>
    ` : ""}
  `;
}

export function layoutArticleCard(
  el: HTMLElement,
  blocks: SemanticBlock[],
  page: PaginationDecision,
  chrome: TemplateChrome,
  context?: TemplateRenderContext,
  renderTop?: ChromeTopRenderer
): void {
  const html = `${renderChrome(page, chrome, context, renderTop)}<main class="article-flow">${renderBlocks(blocks)}</main>`;
  el.empty();
  el.appendChild(sanitizeHTMLToDom(html));
}

// --- Cover page (big-type title card) ---

export const COVER_TITLE_MIN_PX = 84;
export const COVER_TITLE_MAX_PX = 150;

// CJK glyphs are one em wide; latin letters, digits and spaces roughly half.
function effectiveTitleLength(title: string): number {
  return Array.from(title).reduce(
    (sum, ch) => sum + (/[⺀-鿿豈-﫿＀-￯]/.test(ch) ? 1 : 0.55),
    0
  );
}

// Formula-first size so headless environments (happy-dom measures 0) and the
// pre-fit first paint both land near the final value; fitCoverTitle only
// shrinks from here against real DOM metrics.
export function coverTitleFontSize(title: string, availWidth = 920): number {
  const len = Math.max(1, effectiveTitleLength(title));
  // Budget up to 3 wrapped lines; per-line chars drive the size so the value
  // is monotonically non-increasing in title length (no jumps at row breaks).
  // The 0.9 factor leaves side breathing room instead of edge-to-edge type.
  const perLine = Math.ceil(len / 3);
  return Math.max(
    COVER_TITLE_MIN_PX,
    Math.min(COVER_TITLE_MAX_PX, Math.floor((availWidth / perLine) * 0.9))
  );
}

export function fitCoverTitle(
  titleEl: HTMLElement,
  boxEl: HTMLElement,
  minPx = COVER_TITLE_MIN_PX,
  maxPx = COVER_TITLE_MAX_PX
): void {
  const boxWidth = boxEl.clientWidth;
  const boxHeight = boxEl.clientHeight;
  if (!boxWidth || !boxHeight) return;

  // Shrink-only: the formula seed is the ceiling, so the fit never inflates
  // the title to fill the whole box. Height cap keeps whitespace around it.
  const seeded = parseFloat(titleEl.style.fontSize);
  const ceiling = Math.min(maxPx, Number.isFinite(seeded) && seeded > 0 ? seeded : maxPx);
  const maxTitleHeight = boxHeight * 0.62;
  const fits = (fontSize: number): boolean => {
    titleEl.style.fontSize = `${fontSize}px`;
    return titleEl.scrollHeight <= maxTitleHeight && titleEl.scrollWidth <= boxWidth;
  };

  if (fits(ceiling)) return;
  if (!fits(minPx)) return; // keep the floor; line-clamp guards the overflow
  let lo = minPx;
  let hi = ceiling;
  while (hi - lo > 2) {
    const mid = Math.round((lo + hi) / 2);
    if (fits(mid)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  titleEl.style.fontSize = `${lo}px`;
}

function renderCoverProfile(context?: TemplateRenderContext): string {
  const user = context?.user;
  const avatar = (user?.avatar || "").trim();
  const nickname = (user?.nickname || "").trim();
  const handle = (user?.handle || "").trim().replace(/^@+/, "");
  if (!avatar && !nickname && !handle) return "";
  const roundAvatar = user?.roundAvatar !== false;
  const badge = user?.verifiedBadge === true && nickname ? VERIFIED_BADGE_SVG : "";
  return `
    <div class="cover-profile">
      ${avatar ? `<img class="cover-avatar ${roundAvatar ? "is-round" : ""}" src="${escapeHtml(avatar)}" alt="${escapeHtml(nickname || "avatar")}" />` : ""}
      <span class="cover-profile-copy">
        ${nickname ? `<span class="cover-profile-name">${escapeHtml(nickname)}${badge}</span>` : ""}
        ${handle ? `<span class="cover-profile-handle">@${escapeHtml(handle)}</span>` : ""}
      </span>
    </div>
  `;
}

export function layoutTitleCover(el: HTMLElement, ctx: CoverRenderContext): void {
  const title = (ctx.title || "").trim() || "Smart RED";
  const fontSize = coverTitleFontSize(title);
  const profile = ctx.showAuthor !== false ? renderCoverProfile(ctx) : "";
  const html = `
    <div class="cover-flow">
      <div class="cover-title-box">
        <h1 class="cover-title" style="font-size: ${fontSize}px">${escapeHtml(title)}</h1>
        <div class="cover-underline"></div>
      </div>
      ${profile}
    </div>
  `;
  el.empty();
  el.appendChild(sanitizeHTMLToDom(html));
}
