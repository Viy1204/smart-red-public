import "./dom-setup";
import { describe, test, expect } from "bun:test";
import {
  TemplateRenderer,
  headerReservePx,
  HEADER_RESERVE_BASE_PX,
  HEADER_RESERVE_AVATAR_PX,
} from "../template-renderer";
import { editorialTemplate } from "../templates/gallery";
import { BlockType } from "../types";
import type { PaginationDecision } from "../pagination-engine";
import type { TemplateUserInfo } from "../templates/types";

const renderer = new TemplateRenderer();
const page: PaginationDecision = {
  pageIndex: 0,
  blocks: [],
  hasContinuation: false,
};
const block = { type: BlockType.Paragraph, content: "body" };

function renderWithUser(user: Partial<TemplateUserInfo>) {
  const container = document.createElement("div");
  const shadow = renderer.renderCard(container, [block], page, editorialTemplate, { user });
  const card = shadow.querySelector(`.${editorialTemplate.cardClassName}`) as HTMLElement;
  return { shadow, card };
}

describe("headerReservePx", () => {
  test("0 when the header is hidden", () => {
    expect(headerReservePx(false, false)).toBe(0);
    expect(headerReservePx(false, true)).toBe(0);
  });

  test("base reserve without an avatar, taller reserve with one", () => {
    expect(headerReservePx(true, false)).toBe(HEADER_RESERVE_BASE_PX);
    expect(headerReservePx(true, true)).toBe(HEADER_RESERVE_AVATAR_PX);
    expect(HEADER_RESERVE_AVATAR_PX).toBeGreaterThan(HEADER_RESERVE_BASE_PX);
  });
});

describe("profile header rendering", () => {
  test("renders avatar, nickname, verified badge and @handle as a social card", () => {
    const { shadow } = renderWithUser({
      avatar: "app://abc/spongebob.png",
      nickname: "Viy",
      handle: "Viy",
      verifiedBadge: true,
    });
    const img = shadow.querySelector("img.profile-avatar") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("app://abc/spongebob.png");
    expect(shadow.querySelector(".profile-name")?.textContent).toBe("Viy");
    expect(shadow.querySelector(".verified-badge")).not.toBeNull();
    expect(shadow.querySelector(".profile-handle")?.textContent).toBe("@Viy");
  });

  test("normalizes the handle to a single leading @", () => {
    const { shadow } = renderWithUser({ nickname: "Viy", handle: "@@Viy" });
    expect(shadow.querySelector(".profile-handle")?.textContent).toBe("@Viy");
  });

  test("omits the badge when verifiedBadge is off", () => {
    const { shadow } = renderWithUser({ nickname: "Viy", verifiedBadge: false });
    expect(shadow.querySelector(".verified-badge")).toBeNull();
  });

  test("falls back to the eyebrow when no profile info is set", () => {
    const { shadow } = renderWithUser({});
    expect(shadow.querySelector(".profile-chrome")).toBeNull();
    expect(shadow.querySelector(".card-chrome.top")?.textContent).toContain("Field notes");
  });
});

describe("header reserve is published to the card element", () => {
  test("taller reserve when an avatar is shown", () => {
    const { card } = renderWithUser({ avatar: "app://abc/x.png", nickname: "Viy" });
    expect(card.style.getPropertyValue("--header-reserve")).toBe(`${HEADER_RESERVE_AVATAR_PX}px`);
  });

  test("base reserve without an avatar", () => {
    const { card } = renderWithUser({ nickname: "Viy" });
    expect(card.style.getPropertyValue("--header-reserve")).toBe(`${HEADER_RESERVE_BASE_PX}px`);
  });

  test("zero reserve when the header is hidden", () => {
    const { card } = renderWithUser({ showHeader: false });
    expect(card.style.getPropertyValue("--header-reserve")).toBe("0px");
  });
});
