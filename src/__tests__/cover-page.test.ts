import "./dom-setup";
import { describe, test, expect } from "bun:test";
import { TemplateRenderer, computeHeaderReserve } from "../template-renderer";
import {
  editorialTemplate,
  memoTemplate,
  warmSunTemplate,
  templateMap,
  templates,
} from "../templates/gallery";
import {
  coverTitleFontSize,
  fitCoverTitle,
  layoutTitleCover,
  COVER_TITLE_MIN_PX,
  COVER_TITLE_MAX_PX,
} from "../templates/utils";
import { coverFileName, pageFileName } from "../export-pipeline";
import type { CoverRenderContext } from "../templates/types";
import { BlockType } from "../types";
import type { PaginationDecision } from "../pagination-engine";

const renderer = new TemplateRenderer();

function renderCover(context: CoverRenderContext, template = editorialTemplate) {
  const container = document.createElement("div");
  const shadow = renderer.renderCoverCard(container, template, context);
  const card = shadow.querySelector(`.${template.cardClassName}`) as HTMLElement;
  return { shadow, card };
}

describe("coverTitleFontSize", () => {
  test("short titles get display-size type", () => {
    expect(coverTitleFontSize("四字标题")).toBeGreaterThanOrEqual(150);
    expect(coverTitleFontSize("四字标题")).toBeLessThanOrEqual(COVER_TITLE_MAX_PX);
  });

  test("long titles stay within bounds", () => {
    const thirty = "这是一个整整三十个字符长度的超长文章标题用来测试缩放".padEnd(30, "字");
    const size = coverTitleFontSize(thirty);
    expect(size).toBeGreaterThanOrEqual(COVER_TITLE_MIN_PX);
    expect(size).toBeLessThanOrEqual(COVER_TITLE_MAX_PX);
  });

  test("size never grows as the title gets longer", () => {
    let prev = Number.POSITIVE_INFINITY;
    for (let len = 2; len <= 34; len++) {
      const size = coverTitleFontSize("标".repeat(len));
      expect(size).toBeLessThanOrEqual(prev);
      prev = size;
    }
  });

  test("fitCoverTitle keeps the formula value when measurement yields zero", () => {
    const box = document.createElement("div");
    const title = document.createElement("h1");
    title.style.fontSize = "120px";
    box.appendChild(title);
    fitCoverTitle(title, box);
    expect(title.style.fontSize).toBe("120px");
  });
});

describe("layoutTitleCover", () => {
  const baseCtx: CoverRenderContext = { title: "创业公司没有光环" };

  test("renders the escaped title and accent underline", () => {
    const el = document.createElement("div");
    layoutTitleCover(el, { title: '<script>alert("x")</script>' });
    expect(el.querySelector(".cover-title")).not.toBeNull();
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector(".cover-title")!.textContent).toContain("alert");
    expect(el.querySelector(".cover-underline")).not.toBeNull();
  });

  test("shows the author card when user info is set", () => {
    const { card } = renderCover({
      ...baseCtx,
      showAuthor: true,
      user: { nickname: "Viy", handle: "viy", verifiedBadge: true },
    });
    expect(card.querySelector(".cover-profile")).not.toBeNull();
    expect(card.querySelector(".cover-profile-name")!.textContent).toContain("Viy");
    expect(card.querySelector(".cover-profile-handle")!.textContent).toBe("@viy");
    expect(card.querySelector(".verified-badge")).not.toBeNull();
  });

  test("hides the author card when showAuthor is false", () => {
    const { card } = renderCover({
      ...baseCtx,
      showAuthor: false,
      user: { nickname: "Viy", handle: "viy" },
    });
    expect(card.querySelector(".cover-profile")).toBeNull();
  });

  test("omits the author card when no user info exists", () => {
    const { card } = renderCover({ ...baseCtx, showAuthor: true, user: {} });
    expect(card.querySelector(".cover-profile")).toBeNull();
  });

  test("every template can lay out a cover", () => {
    for (const template of templates) {
      const el = document.createElement("div");
      template.layoutCover(el, { title: "标题" });
      expect(el.querySelector(".cover-title")).not.toBeNull();
    }
  });
});

describe("cover export naming", () => {
  test("cover sorts before the first content page", () => {
    expect(coverFileName("我的标题")).toBe("我的标题-00.png");
    expect(pageFileName(0, "我的标题")).toBe("我的标题-01.png");
    expect([pageFileName(0, "t"), coverFileName("t")].sort()[0]).toBe("t-00.png");
  });

  test("falls back to the default title", () => {
    expect(coverFileName("")).toBe("小红书笔记-00.png");
  });
});

describe("new templates", () => {
  const page: PaginationDecision = { pageIndex: 0, blocks: [], hasContinuation: false };
  const block = { type: BlockType.Paragraph, content: "正文" };

  test("warm-sun and memo are registered", () => {
    expect(templateMap["warm-sun"]).toBe(warmSunTemplate);
    expect(templateMap.memo).toBe(memoTemplate);
    expect(warmSunTemplate.styles).toContain("#fffaf5");
    expect(warmSunTemplate.styles).toContain(".sr-warm-sun-card");
  });

  test("memo renders its nav bar instead of the profile header", () => {
    const container = document.createElement("div");
    const shadow = renderer.renderCard(container, [block], page, memoTemplate, {
      user: { nickname: "Viy", handle: "viy" },
    });
    expect(shadow.querySelector(".memo-nav-back")).not.toBeNull();
    expect(shadow.querySelector(".memo-nav-actions")).not.toBeNull();
    expect(shadow.querySelector(".profile-chrome")).toBeNull();
  });

  test("memo header reserve honors the template floor and profile max", () => {
    expect(memoTemplate.headerReserveMinPx).toBe(110);
    expect(computeHeaderReserve({}, 22, 110)).toBe(110);
    const bigProfile = computeHeaderReserve(
      { avatar: "x", nickname: "n", handle: "h", subtitle: "s" },
      32,
      110
    );
    expect(bigProfile).toBeGreaterThanOrEqual(110);
    expect(bigProfile).toBe(
      computeHeaderReserve({ avatar: "x", nickname: "n", handle: "h", subtitle: "s" }, 32)
    );
  });

  test("memo card style pins the header reserve into the pagination budget", () => {
    const container = document.createElement("div");
    const shadow = renderer.renderCard(container, [block], page, memoTemplate, {});
    const card = shadow.querySelector(`.${memoTemplate.cardClassName}`) as HTMLElement;
    expect(card.style.getPropertyValue("--header-reserve")).toBe("110px");
  });
});
