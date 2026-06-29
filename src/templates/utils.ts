import { BlockType, type SemanticBlock } from "../types";
import type { PaginationDecision } from "../pagination-engine";
import type { TemplateRenderContext } from "./types";

export type TemplateId =
  | "editorial"
  | "monochrome"
  | "neo-grid"
  | "warm-zine"
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

export function renderChrome(
  page: PaginationDecision,
  chrome: TemplateChrome,
  context?: TemplateRenderContext
): string {
  const pageNo = String(page.pageIndex + 1).padStart(2, "0");
  const user = context?.user;
  const showHeader = user?.showHeader !== false;
  const showFooter = user?.showFooter !== false;
  const footer = (user?.footer || "").trim() || (page.hasContinuation ? "continued" : "Smart RED");
  return `
    ${showHeader ? `
    <div class="card-chrome top">
      ${renderProfileHeader(chrome, context)}
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
  context?: TemplateRenderContext
): void {
  const html = `${renderChrome(page, chrome, context)}<main class="article-flow">${renderBlocks(blocks)}</main>`;
  el.empty();
  el.appendChild(document.createRange().createContextualFragment(html));
}
