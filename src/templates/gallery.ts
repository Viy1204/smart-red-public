import type { SemanticBlock } from "../types";
import type { PaginationDecision } from "../pagination-engine";
import type { Template, TemplateRenderContext } from "./types";
import { layoutArticleCard, type TemplateId } from "./utils";
import { HEADER_RESERVE_BASE_PX, FOOTER_CONTENT_RESERVE_PX } from "../template-renderer";

const SYSTEM_SANS = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
const SYSTEM_SERIF = `"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", Georgia, serif`;
const SYSTEM_MONO = `"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
// Free Google Fonts substitutes for proprietary brand faces (loaded by the view).
// Latin display carries the brand voice; CJK still falls back to the system serif/sans.
const INTER = `"Inter", ${SYSTEM_SANS}`;
const HANKEN = `"Hanken Grotesk", ${SYSTEM_SANS}`;
const PLAYFAIR = `"Playfair Display", "Songti SC", "STSong", Georgia, serif`;
const SOURCE_SERIF = `"Source Serif 4", ${SYSTEM_SERIF}`;

const BASE_STYLES = `
:host { display: block; background: transparent; }
* { box-sizing: border-box; }
a { color: inherit; text-decoration-thickness: 2px; text-underline-offset: 5px; }
strong { font-weight: 800; color: var(--strong-color, inherit); }
em { font-style: italic; }
del { opacity: 0.62; }
code {
  font-family: var(--mono);
  font-size: 0.84em;
  padding: 0.08em 0.34em;
  border: 1px solid var(--hairline);
  background: var(--inline-code-bg);
  color: var(--accent);
}
.article-flow {
  position: relative;
  z-index: 2;
  height: 100%;
  overflow: hidden;
}
.article-flow > *:first-child { margin-top: 0; }
h1, h2, h3, h4, h5, h6 {
  font-family: var(--display);
  color: var(--heading);
  text-wrap: balance;
  letter-spacing: 0;
}
h1 { font-size: var(--h1); line-height: 1.08; margin: 0 0 30px; color: var(--h1-color, var(--heading)); }
h2 { font-size: var(--h2); line-height: 1.14; margin: 0 0 24px; color: var(--h2-color, var(--heading)); }
h3 { font-size: var(--h3); line-height: 1.22; margin: 0 0 20px; color: var(--h3-color, var(--heading)); }
h4, h5, h6 { font-size: var(--h4); line-height: 1.28; margin: 0 0 18px; }
p {
  margin: 0 0 var(--para-gap);
  color: var(--body);
}
blockquote {
  margin: 30px 0;
  padding: 24px 28px;
  font-family: var(--display);
  font-size: var(--quote-size);
  line-height: 1.42;
  color: var(--quote);
  background: var(--quote-bg);
  border: 1px solid var(--hairline);
}
ul, ol {
  margin: 0 0 var(--para-gap);
  padding-left: 0;
  list-style: none;
}
li {
  position: relative;
  margin: 0 0 14px;
  padding-left: 42px;
  color: var(--body);
}
ul li::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 0.72em;
  width: 14px;
  height: 14px;
  background: var(--accent);
}
ol { counter-reset: item; }
ol li { counter-increment: item; }
ol li::before {
  content: counter(item, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 0.08em;
  font-family: var(--mono);
  font-size: 0.62em;
  color: var(--accent);
}
.task-item {
  display: flex;
  gap: 14px;
  padding-left: 0;
  align-items: flex-start;
}
.task-item::before { display: none; }
.task-box {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  margin-top: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--accent);
  color: var(--accent);
  font-size: 21px;
  line-height: 1;
}
hr {
  border: 0;
  border-top: 2px solid var(--rule);
  margin: 34px 0;
}
.wikilink {
  color: var(--accent);
  border-bottom: 2px solid var(--accent-soft);
}
.image-block {
  margin: 26px 0 28px;
}
.image-block img {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  max-height: 960px;
  width: 100%;
  height: auto;
  object-fit: contain;
  border: 1px solid var(--hairline);
  background: var(--image-bg);
}
.image-block img::before { content: ""; }
.image-block figcaption {
  margin-top: 10px;
  color: var(--muted);
  font-size: 22px;
  font-family: var(--caption);
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 26px 0 30px;
  font-size: 25px;
  line-height: 1.42;
  color: var(--body);
}
th, td {
  border: 1px solid var(--hairline);
  padding: 14px 16px;
  vertical-align: top;
}
th {
  color: var(--heading);
  background: var(--table-head);
  font-family: var(--caption);
  font-weight: 800;
}
.code-block {
  margin: 28px 0 30px;
  border: 1px solid var(--hairline);
  background: var(--code-bg);
  color: var(--code);
}
.code-block figcaption {
  padding: 13px 18px 10px;
  border-bottom: 1px solid var(--hairline);
  color: var(--accent);
  font-family: var(--mono);
  font-size: 19px;
  letter-spacing: 0;
}
.code-block pre {
  margin: 0;
  padding: 18px;
  overflow: hidden;
  font-family: var(--mono);
  font-size: 22px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.code-line {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 16px;
}
.line-num {
  color: var(--muted);
  text-align: right;
  user-select: none;
}
.card-chrome {
  position: absolute;
  z-index: 3;
  left: var(--pad);
  right: var(--pad);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--caption);
  font-size: var(--chrome-size, 22px);
  line-height: 1;
  color: var(--chrome);
  text-transform: uppercase;
  gap: 24px;
}
.card-chrome.top {
  top: 34px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--rule);
}
.card-chrome.bottom {
  bottom: 34px;
  padding-top: 16px;
  border-top: 1px solid var(--rule);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 22px;
}
.article-title-chrome,
.card-chrome.bottom > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.article-title-chrome {
  max-width: 520px;
  text-align: right;
}
.profile-chrome {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 18px;
  text-transform: none;
}
.profile-avatar {
  width: calc(var(--chrome-size, 22px) * 2.9);
  height: calc(var(--chrome-size, 22px) * 2.9);
  object-fit: cover;
  border: 1px solid var(--hairline);
  background: var(--image-bg);
  border-radius: 14px;
}
.profile-avatar.is-round {
  border-radius: 50%;
}
.profile-copy {
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  gap: 5px;
  line-height: 1.3;
}
.profile-nameline {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}
.profile-name {
  flex: 0 1 auto;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: calc(var(--chrome-size, 22px) + 4px);
  font-weight: 800;
  color: var(--heading);
}
.verified-badge {
  flex: 0 0 auto;
  width: calc(var(--chrome-size, 22px) + 6px);
  height: calc(var(--chrome-size, 22px) + 6px);
  display: block;
}
.profile-handle {
  max-width: 440px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: calc(var(--chrome-size, 22px) - 1px);
  color: var(--chrome);
}
.profile-subtitle {
  max-width: 430px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: calc(var(--chrome-size, 22px) - 4px);
  color: var(--chrome);
}
.continuation-hint {
  color: var(--accent);
  font-family: var(--caption);
  font-size: calc(var(--chrome-size, 22px) - 2px);
  text-transform: none;
}
`;

function makeTemplate(config: {
  name: TemplateId;
  displayName: string;
  className: string;
  padding: number;
  baseFontSize: number;
  lineHeightRatio: number;
  backgroundColor: string;
  chrome: { eyebrow: string; volume: string };
  vars: string;
  extras?: string;
}): Template {
  const styles = `
${BASE_STYLES}
.${config.className} {
  --pad: ${config.padding}px;
  --sans: ${SYSTEM_SANS};
  --serif: ${SYSTEM_SERIF};
  --mono: ${SYSTEM_MONO};
  --chrome-size: 22px;
  ${config.vars}
  width: 1080px;
  height: 1440px;
  padding: ${config.padding}px;
  padding-top: calc(${config.padding}px + var(--header-reserve, ${HEADER_RESERVE_BASE_PX}px));
  padding-bottom: calc(${config.padding}px + var(--footer-reserve, ${FOOTER_CONTENT_RESERVE_PX}px));
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  background: var(--paper);
  color: var(--body);
  font-family: var(--body-font);
  font-size: ${config.baseFontSize}px;
  line-height: ${config.lineHeightRatio};
}
.${config.className}::before,
.${config.className}::after {
  content: "";
  position: absolute;
  pointer-events: none;
}
${config.extras || ""}
`;

  return {
    name: config.name,
    displayName: config.displayName,
    cardClassName: config.className,
    cardPadding: config.padding,
    baseFontSize: config.baseFontSize,
    lineHeightRatio: config.lineHeightRatio,
    backgroundColor: config.backgroundColor,
    styles,
    layout(
      el: HTMLElement,
      blocks: SemanticBlock[],
      page: PaginationDecision,
      context?: TemplateRenderContext
    ): void {
      layoutArticleCard(el, blocks, page, config.chrome, context);
    },
  };
}

export const editorialTemplate = makeTemplate({
  name: "editorial",
  displayName: "Editorial",
  className: "sr-editorial-card",
  padding: 78,
  baseFontSize: 31,
  lineHeightRatio: 1.72,
  backgroundColor: "#F7F1E6",
  chrome: { eyebrow: "Field notes", volume: "Smart RED" },
  vars: `
    --paper: #f7f1e6;
    --heading: #211d18;
    --body: #34302a;
    --muted: #928878;
    --accent: #9a4c3f;
    --accent-soft: #d8b4a4;
    --rule: #ded2bf;
    --hairline: #d8cbb7;
    --chrome: #817465;
    --quote: #442e28;
    --quote-bg: rgba(255, 252, 246, 0.72);
    --inline-code-bg: #fbf6ed;
    --code-bg: #2e2a25;
    --code: #f3ead8;
    --table-head: #eee1ce;
    --image-bg: #e4d8c6;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--sans);
    --h1: 68px;
    --h2: 52px;
    --h3: 40px;
    --h4: 34px;
    --quote-size: 36px;
    --para-gap: 24px;
  `,
  extras: `
.sr-editorial-card::before {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(129,116,101,0.055) 0 1px, transparent 1px 100%),
    linear-gradient(180deg, rgba(129,116,101,0.045) 0 1px, transparent 1px 100%);
  background-size: 56px 56px;
  opacity: 0.56;
}
.sr-editorial-card::after {
  width: 236px;
  height: 236px;
  right: -82px;
  top: 140px;
  border: 2px solid rgba(154,76,63,0.22);
  border-radius: 50%;
}
.sr-editorial-card h1, .sr-editorial-card h2 { font-weight: 700; }
.sr-editorial-card h1::after, .sr-editorial-card h2::after {
  content: "";
  display: block;
  width: 84px;
  border-top: 5px solid var(--accent);
  margin-top: 20px;
}
`,
});

export const monochromeTemplate = makeTemplate({
  name: "monochrome",
  displayName: "Monochrome",
  className: "sr-monochrome-card",
  padding: 74,
  baseFontSize: 30,
  lineHeightRatio: 1.68,
  backgroundColor: "#F7F3E9",
  chrome: { eyebrow: "Ivory ledger", volume: "Research card" },
  vars: `
    --paper: #f7f3e9;
    --heading: #111111;
    --body: #171717;
    --muted: #77736a;
    --accent: #111111;
    --accent-soft: #9f9a90;
    --rule: #111111;
    --hairline: #111111;
    --chrome: #111111;
    --quote: #111111;
    --quote-bg: transparent;
    --inline-code-bg: #ebe5d8;
    --code-bg: #111111;
    --code: #f7f3e9;
    --table-head: #e9e2d4;
    --image-bg: #dfd8ca;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 66px;
    --h2: 50px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 38px;
    --para-gap: 22px;
  `,
  extras: `
.sr-monochrome-card { border: 18px solid #111111; }
.sr-monochrome-card::before {
  inset: 52px;
  border: 1px solid rgba(17,17,17,0.18);
}
.sr-monochrome-card blockquote {
  border-width: 3px 0;
  padding-left: 0;
  padding-right: 0;
}
.sr-monochrome-card ul li::before { border-radius: 50%; }
`,
});

export const neoGridTemplate = makeTemplate({
  name: "neo-grid",
  displayName: "Neo Grid",
  className: "sr-neo-grid-card",
  padding: 64,
  baseFontSize: 29,
  lineHeightRatio: 1.62,
  backgroundColor: "#F8F5E8",
  chrome: { eyebrow: "Signal / grid", volume: "XHS layout" },
  vars: `
    --paper: #f8f5e8;
    --heading: #101010;
    --body: #1c1c1c;
    --muted: #5d6058;
    --accent: #1f55ff;
    --accent-soft: #b8c6ff;
    --rule: #1f55ff;
    --hairline: #161616;
    --chrome: #1f55ff;
    --quote: #101010;
    --quote-bg: #eaff3f;
    --inline-code-bg: #eaff3f;
    --code-bg: #101010;
    --code: #f8f5e8;
    --table-head: #eaff3f;
    --image-bg: #dce3ff;
    --display: var(--sans);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 70px;
    --h2: 54px;
    --h3: 39px;
    --h4: 32px;
    --quote-size: 34px;
    --para-gap: 22px;
  `,
  extras: `
.sr-neo-grid-card::before {
  inset: 0;
  background:
    linear-gradient(90deg, rgba(31,85,255,0.17) 0 2px, transparent 2px 100%),
    linear-gradient(180deg, rgba(31,85,255,0.12) 0 2px, transparent 2px 100%);
  background-size: 72px 72px;
}
.sr-neo-grid-card h1, .sr-neo-grid-card h2, .sr-neo-grid-card h3 {
  text-transform: uppercase;
  font-weight: 900;
}
.sr-neo-grid-card h1, .sr-neo-grid-card h2 {
  display: inline;
  background: #eaff3f;
  box-shadow: 14px 0 0 #eaff3f, -10px 0 0 #eaff3f;
}
.sr-neo-grid-card blockquote { box-shadow: 12px 12px 0 var(--accent); }
`,
});

export const warmZineTemplate = makeTemplate({
  name: "warm-zine",
  displayName: "Warm Zine",
  className: "sr-warm-zine-card",
  padding: 72,
  baseFontSize: 31,
  lineHeightRatio: 1.7,
  backgroundColor: "#F2D982",
  chrome: { eyebrow: "Pinned essay", volume: "Smart RED" },
  vars: `
    --paper: #f2d982;
    --heading: #18372f;
    --body: #22362f;
    --muted: #6b6245;
    --accent: #d14a2f;
    --accent-soft: #f09871;
    --rule: #18372f;
    --hairline: #18372f;
    --chrome: #18372f;
    --quote: #18372f;
    --quote-bg: rgba(255,246,204,0.62);
    --inline-code-bg: rgba(255,246,204,0.72);
    --code-bg: #18372f;
    --code: #fff1b8;
    --table-head: rgba(255,246,204,0.58);
    --image-bg: #e2c768;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--sans);
    --h1: 64px;
    --h2: 50px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 35px;
    --para-gap: 24px;
  `,
  extras: `
.sr-warm-zine-card::before {
  inset: 0;
  opacity: 0.28;
  background:
    radial-gradient(circle at 20% 12%, rgba(255,255,255,0.5) 0 1px, transparent 2px),
    radial-gradient(circle at 80% 66%, rgba(24,55,47,0.34) 0 1px, transparent 2px);
  background-size: 28px 28px, 34px 34px;
}
.sr-warm-zine-card::after {
  left: 64px;
  top: 76px;
  width: 86px;
  height: 20px;
  border-top: 5px solid var(--accent);
  border-bottom: 5px solid var(--accent);
  transform: rotate(-7deg);
}
.sr-warm-zine-card .image-block img,
.sr-warm-zine-card blockquote {
  box-shadow: 10px 10px 0 rgba(24,55,47,0.18);
}
`,
});

export const noirMagazineTemplate = makeTemplate({
  name: "noir-magazine",
  displayName: "Noir Magazine",
  className: "sr-noir-card",
  padding: 76,
  baseFontSize: 30,
  lineHeightRatio: 1.68,
  backgroundColor: "#10100F",
  chrome: { eyebrow: "After hours", volume: "Noir issue" },
  vars: `
    --paper: #10100f;
    --heading: #fff3df;
    --body: #e8ddca;
    --muted: #8e8271;
    --accent: #ff4f8b;
    --accent-soft: #6d334a;
    --rule: #4a4037;
    --hairline: #51473e;
    --chrome: #d8c7ad;
    --quote: #fff3df;
    --quote-bg: #1e1917;
    --inline-code-bg: #221c1a;
    --code-bg: #050505;
    --code: #ffe8c5;
    --table-head: #201a17;
    --image-bg: #1d1b19;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 68px;
    --h2: 52px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 38px;
    --para-gap: 23px;
  `,
  extras: `
.sr-noir-card::before {
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255,79,139,0.17), transparent 34%),
    radial-gradient(circle at 82% 16%, rgba(255,243,223,0.12), transparent 22%);
}
.sr-noir-card::after {
  left: 0;
  bottom: 0;
  width: 100%;
  height: 210px;
  background: linear-gradient(0deg, rgba(255,79,139,0.12), transparent);
}
.sr-noir-card h1, .sr-noir-card h2 { color: var(--heading); }
.sr-noir-card blockquote {
  border-color: var(--accent);
  box-shadow: inset 8px 0 0 var(--accent);
}
.sr-noir-card .image-block img { filter: contrast(1.06) saturate(0.9); }
`,
});

export const ivoryEssayTemplate = makeTemplate({
  name: "ivory-essay",
  displayName: "Ivory Essay",
  className: "sr-ivory-essay-card",
  padding: 76,
  baseFontSize: 31,
  lineHeightRatio: 1.7,
  backgroundColor: "#FBF7EE",
  chrome: { eyebrow: "Longform", volume: "Smart RED" },
  vars: `
    --paper: #fbf7ee;
    --heading: #24211c;
    --body: #37332c;
    --muted: #8f8779;
    --accent: #8d6b4f;
    --accent-soft: #d8c3aa;
    --rule: #ded3c4;
    --hairline: #d7caba;
    --chrome: #756b5e;
    --quote: #3d3027;
    --quote-bg: rgba(255,255,255,0.54);
    --inline-code-bg: #f3eadc;
    --code-bg: #2f2a24;
    --code: #fbf7ee;
    --table-head: #f0e6d7;
    --image-bg: #e7dccd;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--sans);
    --h1: 64px;
    --h2: 48px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 35px;
    --para-gap: 23px;
  `,
  extras: `
.sr-ivory-essay-card::before {
  inset: 40px;
  border: 1px solid rgba(117,107,94,0.18);
}
.sr-ivory-essay-card::after {
  right: 62px;
  top: 118px;
  width: 124px;
  height: 8px;
  background: var(--accent-soft);
}
.sr-ivory-essay-card h1, .sr-ivory-essay-card h2 { font-weight: 700; }
`,
});

export const redLedgerTemplate = makeTemplate({
  name: "red-ledger",
  displayName: "Red Ledger",
  className: "sr-red-ledger-card",
  padding: 70,
  baseFontSize: 30,
  lineHeightRatio: 1.66,
  backgroundColor: "#F8EEE8",
  chrome: { eyebrow: "Ledger", volume: "Smart RED" },
  vars: `
    --paper: #f8eee8;
    --heading: #371b17;
    --body: #3f2b27;
    --muted: #92736b;
    --accent: #b4382e;
    --accent-soft: #e4a297;
    --rule: #c95a4f;
    --hairline: #e2b7ad;
    --chrome: #9f3f36;
    --quote: #371b17;
    --quote-bg: rgba(180,56,46,0.08);
    --inline-code-bg: #f4ded8;
    --code-bg: #361916;
    --code: #fbeee9;
    --table-head: #f1d7d0;
    --image-bg: #e8c6bf;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 66px;
    --h2: 50px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 36px;
    --para-gap: 22px;
  `,
  extras: `
.sr-red-ledger-card::before {
  inset: 0;
  background: linear-gradient(90deg, rgba(180,56,46,0.09) 0 1px, transparent 1px 100%);
  background-size: 44px 44px;
}
.sr-red-ledger-card h1, .sr-red-ledger-card h2 {
  border-left: 10px solid var(--accent);
  padding-left: 22px;
}
`,
});

export const slateJournalTemplate = makeTemplate({
  name: "slate-journal",
  displayName: "Slate Journal",
  className: "sr-slate-journal-card",
  padding: 72,
  baseFontSize: 30,
  lineHeightRatio: 1.68,
  backgroundColor: "#E9ECE8",
  chrome: { eyebrow: "Journal", volume: "Smart RED" },
  vars: `
    --paper: #e9ece8;
    --heading: #1d2628;
    --body: #263235;
    --muted: #6e7778;
    --accent: #426b70;
    --accent-soft: #a8bdbe;
    --rule: #b9c4c2;
    --hairline: #c5cecb;
    --chrome: #536365;
    --quote: #1d2628;
    --quote-bg: rgba(255,255,255,0.42);
    --inline-code-bg: #dde5e2;
    --code-bg: #1f292b;
    --code: #edf3ef;
    --table-head: #d9e1de;
    --image-bg: #d1dad7;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--sans);
    --h1: 62px;
    --h2: 48px;
    --h3: 37px;
    --h4: 31px;
    --quote-size: 35px;
    --para-gap: 22px;
  `,
  extras: `
.sr-slate-journal-card::before {
  inset: 0;
  background:
    linear-gradient(180deg, rgba(66,107,112,0.08) 0 1px, transparent 1px 100%);
  background-size: 100% 46px;
}
.sr-slate-journal-card blockquote { border-left: 8px solid var(--accent); }
`,
});

export const pearlMagazineTemplate = makeTemplate({
  name: "pearl-magazine",
  displayName: "Pearl Magazine",
  className: "sr-pearl-magazine-card",
  padding: 76,
  baseFontSize: 31,
  lineHeightRatio: 1.7,
  backgroundColor: "#F6F3EF",
  chrome: { eyebrow: "Magazine", volume: "Smart RED" },
  vars: `
    --paper: #f6f3ef;
    --heading: #222225;
    --body: #343338;
    --muted: #88838c;
    --accent: #6a5c88;
    --accent-soft: #c6bdda;
    --rule: #d8d2df;
    --hairline: #d6d0db;
    --chrome: #6f6976;
    --quote: #282331;
    --quote-bg: rgba(255,255,255,0.58);
    --inline-code-bg: #eee9f2;
    --code-bg: #24222a;
    --code: #f6f3ef;
    --table-head: #ebe6ef;
    --image-bg: #e0dbe4;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--sans);
    --h1: 66px;
    --h2: 52px;
    --h3: 39px;
    --h4: 32px;
    --quote-size: 36px;
    --para-gap: 23px;
  `,
  extras: `
.sr-pearl-magazine-card::before {
  width: 320px;
  height: 320px;
  right: -112px;
  bottom: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(106,92,136,0.14), transparent 62%);
}
.sr-pearl-magazine-card h1::first-letter,
.sr-pearl-magazine-card h2::first-letter { color: var(--accent); }
`,
});

export const inkReportTemplate = makeTemplate({
  name: "ink-report",
  displayName: "Ink Report",
  className: "sr-ink-report-card",
  padding: 72,
  baseFontSize: 30,
  lineHeightRatio: 1.68,
  backgroundColor: "#F4F1EA",
  chrome: { eyebrow: "Report", volume: "Smart RED" },
  vars: `
    --paper: #f4f1ea;
    --heading: #171717;
    --body: #2d2d2a;
    --muted: #77746c;
    --accent: #1f1f1c;
    --accent-soft: #aaa59b;
    --rule: #b8b2a5;
    --hairline: #cdc6b8;
    --chrome: #5f5b53;
    --quote: #171717;
    --quote-bg: rgba(0,0,0,0.035);
    --inline-code-bg: #e9e3d8;
    --code-bg: #171717;
    --code: #f4f1ea;
    --table-head: #e6dfd2;
    --image-bg: #ddd6c8;
    --display: var(--serif);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 64px;
    --h2: 50px;
    --h3: 38px;
    --h4: 31px;
    --quote-size: 35px;
    --para-gap: 22px;
  `,
  extras: `
.sr-ink-report-card::before {
  inset: 58px;
  border: 2px solid rgba(31,31,28,0.16);
}
.sr-ink-report-card::after {
  left: 0;
  top: 0;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle at 20% 20%, rgba(0,0,0,0.1), transparent 64%);
}
.sr-ink-report-card h1, .sr-ink-report-card h2 { letter-spacing: 0; }
`,
});

// --- Brand-inspired templates (palettes/type from awesome-design-md) ---

export const claudeTemplate = makeTemplate({
  name: "claude",
  displayName: "Claude",
  className: "sr-claude-card",
  padding: 78,
  baseFontSize: 31,
  lineHeightRatio: 1.72,
  backgroundColor: "#FAF9F5",
  chrome: { eyebrow: "Anthropic", volume: "Claude" },
  vars: `
    --paper: #faf9f5;
    --heading: #141413;
    --body: #3d3d3a;
    --muted: #8e8b82;
    --accent: #cc785c;
    --accent-soft: #e3c2b4;
    --rule: #ebe6df;
    --hairline: #e6dfd8;
    --chrome: #6c6a64;
    --quote: #252523;
    --quote-bg: #f5f0e8;
    --inline-code-bg: #f5f0e8;
    --code-bg: #181715;
    --code: #faf9f5;
    --table-head: #efe9de;
    --image-bg: #efe9de;
    --display: "Tiempos Headline", "Copernicus", var(--serif);
    --body-font: var(--sans);
    --caption: var(--sans);
    --h1: 68px;
    --h2: 52px;
    --h3: 40px;
    --h4: 33px;
    --quote-size: 36px;
    --para-gap: 24px;
  `,
  extras: `
.sr-claude-card::before {
  inset: 0;
  background: radial-gradient(circle at 86% 12%, rgba(204,120,92,0.10), transparent 30%);
}
.sr-claude-card::after {
  right: 72px;
  top: 118px;
  width: 30px;
  height: 30px;
  background: conic-gradient(from 0deg, var(--accent) 0 9%, transparent 9% 25%, var(--accent) 25% 34%, transparent 34% 50%, var(--accent) 50% 59%, transparent 59% 75%, var(--accent) 75% 84%, transparent 84% 100%);
  border-radius: 50%;
  opacity: 0.5;
}
.sr-claude-card h1, .sr-claude-card h2 { font-weight: 600; }
.sr-claude-card h1::after {
  content: "";
  display: block;
  width: 72px;
  border-top: 4px solid var(--accent);
  margin-top: 18px;
}
`,
});

export const minimaxTemplate = makeTemplate({
  name: "minimax",
  displayName: "MiniMax",
  className: "sr-minimax-card",
  padding: 74,
  baseFontSize: 30,
  lineHeightRatio: 1.66,
  backgroundColor: "#FFFFFF",
  chrome: { eyebrow: "MiniMax", volume: "Intelligence" },
  vars: `
    --paper: #ffffff;
    --heading: #0a0a0a;
    --body: #222222;
    --muted: #8e8e93;
    --accent: #ff5530;
    --accent-soft: #ffc9bb;
    --rule: #e5e7eb;
    --hairline: #e5e7eb;
    --chrome: #45515e;
    --quote: #0a0a0a;
    --quote-bg: #f7f8fa;
    --inline-code-bg: #f2f3f5;
    --code-bg: #0a0a0a;
    --code: #ffffff;
    --table-head: #f2f3f5;
    --image-bg: #f2f3f5;
    --display: "DM Sans", var(--sans);
    --body-font: "DM Sans", var(--sans);
    --caption: "DM Sans", var(--sans);
    --h1: 76px;
    --h2: 56px;
    --h3: 40px;
    --h4: 33px;
    --quote-size: 35px;
    --para-gap: 22px;
  `,
  extras: `
.sr-minimax-card::before {
  width: 380px;
  height: 380px;
  right: -130px;
  top: -130px;
  border-radius: 50%;
  background: conic-gradient(from 140deg, #ff5530, #ea5ec1, #a855f7, #1456f0, #ff5530);
  filter: blur(10px);
  opacity: 0.92;
}
.sr-minimax-card h1, .sr-minimax-card h2 { font-weight: 800; letter-spacing: -0.5px; }
.sr-minimax-card blockquote { border: 0; border-left: 6px solid #ff5530; border-radius: 0 10px 10px 0; }
`,
});

export const xaiTemplate = makeTemplate({
  name: "xai",
  displayName: "xAI",
  className: "sr-xai-card",
  padding: 76,
  baseFontSize: 30,
  lineHeightRatio: 1.66,
  backgroundColor: "#0A0A0A",
  chrome: { eyebrow: "xAI", volume: "Frontier" },
  vars: `
    --paper: #0a0a0a;
    --heading: #ffffff;
    --body: #dadbdf;
    --muted: #7d8187;
    --accent: #ff7a17;
    --accent-soft: #ffc285;
    --rule: #212327;
    --hairline: #212327;
    --chrome: #7d8187;
    --quote: #ffffff;
    --quote-bg: #191919;
    --inline-code-bg: #1a1c20;
    --code-bg: #000000;
    --code: #ffc285;
    --table-head: #1a1c20;
    --image-bg: #191919;
    --display: "Universal Sans", "Inter", var(--sans);
    --body-font: "Inter", var(--sans);
    --caption: var(--mono);
    --h1: 72px;
    --h2: 54px;
    --h3: 40px;
    --h4: 32px;
    --quote-size: 35px;
    --para-gap: 23px;
  `,
  extras: `
.sr-xai-card::before {
  left: 0;
  right: 0;
  bottom: 0;
  height: 340px;
  background: linear-gradient(0deg, rgba(255,122,23,0.18), rgba(124,58,237,0.07) 52%, transparent);
}
.sr-xai-card h1, .sr-xai-card h2, .sr-xai-card h3 { letter-spacing: -0.5px; }
.sr-xai-card blockquote { border-color: var(--accent); }
`,
});

export const lovableTemplate = makeTemplate({
  name: "lovable",
  displayName: "Lovable",
  className: "sr-lovable-card",
  padding: 80,
  baseFontSize: 31,
  lineHeightRatio: 1.74,
  backgroundColor: "#F7F4ED",
  chrome: { eyebrow: "Lovable", volume: "Build" },
  vars: `
    --paper: #f7f4ed;
    --heading: #1c1c1c;
    --body: #3a3935;
    --muted: #5f5f5d;
    --accent: #e8623c;
    --accent-soft: #f3b9a5;
    --rule: #eceae4;
    --hairline: #e6e3da;
    --chrome: #5f5f5d;
    --quote: #1c1c1c;
    --quote-bg: #efece5;
    --inline-code-bg: #efe9df;
    --code-bg: #1c1c1c;
    --code: #fcfbf8;
    --table-head: #efece5;
    --image-bg: #eceae4;
    --display: ${HANKEN};
    --body-font: ${HANKEN};
    --caption: ${HANKEN};
    --h1: 66px;
    --h2: 50px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 35px;
    --para-gap: 24px;
  `,
  extras: `
.sr-lovable-card::before {
  width: 320px;
  height: 320px;
  right: -120px;
  top: -110px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(232,98,60,0.26), rgba(234,94,193,0.10) 55%, transparent 72%);
}
.sr-lovable-card h1, .sr-lovable-card h2, .sr-lovable-card h3 {
  font-weight: 600;
  letter-spacing: -1.4px;
}
.sr-lovable-card .image-block img { border-radius: 18px; border-color: #e6e3da; }
.sr-lovable-card blockquote {
  border: 1px solid #e6e3da;
  border-radius: 18px;
  box-shadow: inset 0 -3px 0 rgba(28,28,28,0.05);
}
.sr-lovable-card ul li::before { border-radius: 50%; }
.sr-lovable-card code { border-radius: 7px; }
.sr-lovable-card hr { border-top: 1px solid #e6e3da; }
.sr-lovable-card a { color: var(--accent); }
`,
});

export const notionTemplate = makeTemplate({
  name: "notion",
  displayName: "Notion",
  className: "sr-notion-card",
  padding: 74,
  baseFontSize: 30,
  lineHeightRatio: 1.7,
  backgroundColor: "#FFFFFF",
  chrome: { eyebrow: "Notion", volume: "Workspace" },
  vars: `
    --paper: #ffffff;
    --heading: #1a1a1a;
    --body: #37352f;
    --muted: #9b9890;
    --accent: #5645d4;
    --accent-soft: #d6b6f6;
    --rule: #e5e3df;
    --hairline: #e5e3df;
    --chrome: #5645d4;
    --quote: #1a1a1a;
    --quote-bg: #e6e0f5;
    --inline-code-bg: #f0eeec;
    --code-bg: #0a1530;
    --code: #ffffff;
    --table-head: #f6f5f4;
    --image-bg: #f0eeec;
    --display: ${INTER};
    --body-font: ${INTER};
    --caption: ${INTER};
    --h1: 66px;
    --h2: 46px;
    --h3: 38px;
    --h4: 32px;
    --quote-size: 33px;
    --para-gap: 23px;
  `,
  extras: `
.sr-notion-card::before {
  left: 30px;
  top: 318px;
  width: 14px;
  height: 268px;
  background:
    radial-gradient(circle 7px at 7px 7px, #ff64c8 98%, transparent),
    radial-gradient(circle 7px at 7px 72px, #f5d75e 98%, transparent),
    radial-gradient(circle 7px at 7px 137px, #1aae39 98%, transparent),
    radial-gradient(circle 7px at 7px 202px, #0075de 98%, transparent),
    radial-gradient(circle 7px at 7px 261px, #7b3ff2 98%, transparent);
  opacity: 0.9;
}
.sr-notion-card h1 { font-weight: 800; letter-spacing: -0.5px; }
.sr-notion-card h2 {
  display: inline-block;
  font-weight: 700;
  color: #37352f;
  padding: 7px 18px;
  border-radius: 9px;
  letter-spacing: -0.3px;
}
.sr-notion-card h2:nth-of-type(3n+1) { background: #e6e0f5; }
.sr-notion-card h2:nth-of-type(3n+2) { background: #ffe8d4; }
.sr-notion-card h2:nth-of-type(3n+3) { background: #d9f3e1; }
.sr-notion-card blockquote {
  position: relative;
  border: 0;
  border-radius: 8px;
  background: #f1f1ef;
  color: var(--body);
  font-family: ${INTER};
  font-weight: 500;
  padding: 24px 30px 24px 66px;
}
.sr-notion-card blockquote::before {
  content: "";
  position: absolute;
  left: 26px;
  top: 30px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
}
.sr-notion-card .wikilink {
  border: 0;
  border-radius: 5px;
  padding: 1px 9px;
  background: rgba(123,63,242,0.13);
  color: #6a3fd0;
}
.sr-notion-card code {
  border: 0;
  border-radius: 5px;
  background: #f1eff4;
  color: #c5483f;
}
.sr-notion-card .image-block img { border-radius: 10px; }
`,
});

export const figmaTemplate = makeTemplate({
  name: "figma",
  displayName: "Figma",
  className: "sr-figma-card",
  padding: 72,
  baseFontSize: 30,
  lineHeightRatio: 1.64,
  backgroundColor: "#FFFFFF",
  chrome: { eyebrow: "Figma", volume: "Design" },
  vars: `
    --paper: #ffffff;
    --heading: #000000;
    --body: #1a1a1a;
    --muted: #6b6b6b;
    --accent: #ff3d8b;
    --accent-soft: #c5b0f4;
    --rule: #e6e6e6;
    --hairline: #e6e6e6;
    --chrome: #000000;
    --quote: #000000;
    --quote-bg: #dceeb1;
    --inline-code-bg: #f7f7f5;
    --code-bg: #1f1d3d;
    --code: #ffffff;
    --table-head: #f4ecd6;
    --image-bg: #f7f7f5;
    --display: "figmaSans", var(--sans);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 70px;
    --h2: 54px;
    --h3: 40px;
    --h4: 32px;
    --quote-size: 34px;
    --para-gap: 22px;
  `,
  extras: `
.sr-figma-card::before {
  right: 60px;
  top: 122px;
  width: 116px;
  height: 116px;
  background: #c5b0f4;
  transform: rotate(-8deg);
  border-radius: 18px;
  opacity: 0.9;
}
.sr-figma-card::after {
  left: 68px;
  bottom: 116px;
  width: 84px;
  height: 84px;
  background: #c8e6cd;
  border-radius: 50%;
  opacity: 0.9;
}
.sr-figma-card h1, .sr-figma-card h2 { font-weight: 800; }
.sr-figma-card h1 {
  display: inline;
  background: #dceeb1;
  box-shadow: 12px 0 0 #dceeb1, -8px 0 0 #dceeb1;
}
.sr-figma-card blockquote { border: 0; border-radius: 16px; }
.sr-figma-card .image-block img { border-radius: 12px; }
`,
});

export const appleTemplate = makeTemplate({
  name: "apple",
  displayName: "Apple",
  className: "sr-apple-card",
  padding: 88,
  baseFontSize: 32,
  lineHeightRatio: 1.7,
  backgroundColor: "#FFFFFF",
  chrome: { eyebrow: "Apple", volume: "Newsroom" },
  vars: `
    --paper: #ffffff;
    --heading: #1d1d1f;
    --body: #1d1d1f;
    --muted: #86868b;
    --accent: #0066cc;
    --accent-soft: #d2d2d7;
    --rule: #f0f0f0;
    --hairline: #e0e0e0;
    --chrome: #86868b;
    --quote: #1d1d1f;
    --quote-bg: #f5f5f7;
    --inline-code-bg: #f5f5f7;
    --code-bg: #1d1d1f;
    --code: #f5f5f7;
    --table-head: #f5f5f7;
    --image-bg: #f5f5f7;
    --display: ${INTER};
    --body-font: ${INTER};
    --caption: ${INTER};
    --h1: 92px;
    --h2: 60px;
    --h3: 43px;
    --h4: 34px;
    --quote-size: 42px;
    --para-gap: 28px;
  `,
  extras: `
.sr-apple-card h1 { font-weight: 700; letter-spacing: -3px; line-height: 1.03; }
.sr-apple-card h2 { font-weight: 700; letter-spacing: -1.6px; }
.sr-apple-card h3 { font-weight: 600; letter-spacing: -1px; }
.sr-apple-card .image-block img {
  border: 0;
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(0,0,0,0.12);
}
.sr-apple-card blockquote {
  border: 0;
  text-align: center;
  font-weight: 600;
  letter-spacing: -0.8px;
  color: var(--heading);
}
.sr-apple-card a { color: var(--accent); text-decoration: none; font-weight: 500; }
.sr-apple-card hr { border-top: 1px solid var(--hairline); }
`,
});

export const theVergeTemplate = makeTemplate({
  name: "the-verge",
  displayName: "The Verge",
  className: "sr-the-verge-card",
  padding: 74,
  baseFontSize: 30,
  lineHeightRatio: 1.62,
  backgroundColor: "#131313",
  chrome: { eyebrow: "The Verge", volume: "StoryStream" },
  vars: `
    --paper: #131313;
    --heading: #ffffff;
    --body: #e9e9e9;
    --muted: #949494;
    --accent: #3cffd0;
    --accent-soft: #5200ff;
    --rule: #2d2d2d;
    --hairline: #313131;
    --chrome: #3cffd0;
    --quote: #131313;
    --quote-bg: #3cffd0;
    --inline-code-bg: #2d2d2d;
    --code-bg: #000000;
    --code: #3cffd0;
    --table-head: #2d2d2d;
    --image-bg: #2d2d2d;
    --display: "Haettenschweiler", "Arial Narrow", "Impact", var(--sans);
    --body-font: var(--sans);
    --caption: var(--mono);
    --h1: 86px;
    --h2: 60px;
    --h3: 42px;
    --h4: 33px;
    --quote-size: 34px;
    --para-gap: 22px;
  `,
  extras: `
.sr-the-verge-card h1, .sr-the-verge-card h2 {
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: -0.5px;
  line-height: 0.98;
}
.sr-the-verge-card blockquote {
  color: #000000;
  border: 2px solid #5200ff;
  border-radius: 26px;
}
.sr-the-verge-card code { border-color: var(--accent); }
.sr-the-verge-card .image-block img { border-radius: 22px; border-color: #313131; }
`,
});

export const wiredTemplate = makeTemplate({
  name: "wired",
  displayName: "Wired",
  className: "sr-wired-card",
  padding: 76,
  baseFontSize: 31,
  lineHeightRatio: 1.74,
  backgroundColor: "#FFFFFF",
  chrome: { eyebrow: "Wired", volume: "连线" },
  vars: `
    --paper: #ffffff;
    --heading: #000000;
    --body: #1a1a1a;
    --muted: #757575;
    --accent: #057dbc;
    --accent-soft: #b8dcef;
    --rule: #000000;
    --hairline: #e0e0e0;
    --chrome: #000000;
    --quote: #000000;
    --quote-bg: #f5f5f5;
    --inline-code-bg: #f5f5f5;
    --code-bg: #000000;
    --code: #ffffff;
    --table-head: #f5f5f5;
    --image-bg: #f5f5f5;
    --display: ${PLAYFAIR};
    --body-font: ${SOURCE_SERIF};
    --caption: var(--sans);
    --h1: 94px;
    --h2: 60px;
    --h3: 42px;
    --h4: 33px;
    --quote-size: 38px;
    --para-gap: 24px;
  `,
  extras: `
.sr-wired-card h1 {
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 0.98;
  padding-bottom: 20px;
  border-bottom: 6px solid #000000;
}
.sr-wired-card h2, .sr-wired-card h3 { font-weight: 700; letter-spacing: -0.5px; line-height: 1.04; }
.sr-wired-card .article-flow > p:first-of-type::first-letter {
  float: left;
  font-family: ${PLAYFAIR};
  font-weight: 800;
  font-size: 112px;
  line-height: 0.74;
  margin: 10px 16px 0 0;
  color: #000000;
}
.sr-wired-card blockquote {
  border: 0;
  border-left: 6px solid #000000;
  font-family: ${PLAYFAIR};
  font-style: italic;
}
.sr-wired-card hr { border-top: 4px solid #000000; }
.sr-wired-card a { color: var(--accent); }
`,
});

export const templates = [
  editorialTemplate,
  monochromeTemplate,
  neoGridTemplate,
  warmZineTemplate,
  noirMagazineTemplate,
  ivoryEssayTemplate,
  redLedgerTemplate,
  slateJournalTemplate,
  pearlMagazineTemplate,
  inkReportTemplate,
  claudeTemplate,
  minimaxTemplate,
  xaiTemplate,
  lovableTemplate,
  notionTemplate,
  figmaTemplate,
  appleTemplate,
  theVergeTemplate,
  wiredTemplate,
] as const;

export const templateMap: Record<TemplateId, Template> = {
  editorial: editorialTemplate,
  monochrome: monochromeTemplate,
  "neo-grid": neoGridTemplate,
  "warm-zine": warmZineTemplate,
  "noir-magazine": noirMagazineTemplate,
  "ivory-essay": ivoryEssayTemplate,
  "red-ledger": redLedgerTemplate,
  "slate-journal": slateJournalTemplate,
  "pearl-magazine": pearlMagazineTemplate,
  "ink-report": inkReportTemplate,
  claude: claudeTemplate,
  minimax: minimaxTemplate,
  xai: xaiTemplate,
  lovable: lovableTemplate,
  notion: notionTemplate,
  figma: figmaTemplate,
  apple: appleTemplate,
  "the-verge": theVergeTemplate,
  wired: wiredTemplate,
};

export function getTemplate(id: string | undefined): Template {
  return templateMap[(id as TemplateId) || "editorial"] || editorialTemplate;
}
