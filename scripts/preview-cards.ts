// Dev-only visual harness: renders new templates + covers into a static HTML
// file for eyeballing outside Obsidian. Run: bun scripts/preview-cards.ts
import { Window } from "happy-dom";
import { writeFileSync } from "node:fs";

const win = new Window();
(globalThis as any).document = win.document;
(globalThis as any).HTMLElement = win.HTMLElement;

const { warmSunTemplate, memoTemplate, editorialTemplate } = await import("../src/templates/gallery");
const { BlockType } = await import("../src/types");

const blocks = [
  { type: BlockType.Heading, content: "创业公司没有光环，但有另一种壁垒", metadata: { level: 1 } },
  { type: BlockType.Paragraph, content: "校招生态里有一个反常识：创业公司不捧你。**但心里还有一点侥幸。总觉得离真正冲到面前，还要一段时间。**" },
  { type: BlockType.Heading, content: "一、创业公司没有 HR 体系", metadata: { level: 2 } },
  { type: BlockType.Paragraph, content: "没有**我们是一家人**。没有你眼里有活。没有 HR 给你讲使命、讲愿景、讲*我们一起改变世界*。" },
  { type: BlockType.Heading, content: "接近决策者是什么感觉", metadata: { level: 3 } },
  { type: BlockType.Blockquote, content: "但创业公司有另一种光环，是接近决策者。" },
  { type: BlockType.List, content: "- 第一周就让你干活\n- 干不出来就走\n- 老板 30 岁，HR 是会计兼的" },
];

const page = { pageIndex: 0, blocks, hasContinuation: true };
const user = { nickname: "Viy", handle: "viy", subtitle: "职场观察", verifiedBadge: true, footer: "Smart RED", showHeader: true, showFooter: true };

function card(template: any, mode: "content" | "cover", title: string): string {
  const el = win.document.createElement("div");
  el.className = template.cardClassName;
  (el as any).style.cssText = "width:1080px;height:1440px;box-sizing:border-box;overflow:hidden;position:relative;";
  el.style.setProperty("--header-reserve", mode === "cover" ? "24px" : `${template.headerReserveMinPx ?? 60}px`);
  el.style.setProperty("--footer-reserve", mode === "cover" ? "110px" : "42px");
  if (mode === "cover") {
    template.layoutCover(el, { title, showAuthor: true, user });
  } else {
    template.layout(el, blocks, page, { user, sectionTitle: title });
  }
  return `<div class="slot"><style>${template.styles}</style>${el.outerHTML}<p class="cap">${template.displayName} / ${mode}</p></div>`;
}

const title = "负责企业 AI 选型采购的人，必须看懂这 9 件事";
const html = `<!doctype html><meta charset="utf-8"><style>
body{background:#555;margin:0;padding:24px;display:flex;flex-wrap:wrap;gap:24px;font-family:sans-serif}
.slot{transform:scale(0.38);transform-origin:top left;width:1080px;height:1500px;margin-right:-650px;margin-bottom:-900px}
.cap{color:#fff;font-size:40px}
</style>
${card(warmSunTemplate, "content", title)}
${card(memoTemplate, "content", title)}
${card(warmSunTemplate, "cover", title)}
${card(memoTemplate, "cover", title)}
${card(editorialTemplate, "cover", "四字标题")}
${card(editorialTemplate, "cover", title)}
`;
writeFileSync("scripts/preview-cards.html", html);
console.log("wrote scripts/preview-cards.html");
