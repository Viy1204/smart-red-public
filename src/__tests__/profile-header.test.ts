import "./dom-setup";
import { describe, test, expect } from "bun:test";
import {
  TemplateRenderer,
  computeHeaderReserve,
  footerReservePx,
  HEADER_RESERVE_BASE_PX,
  FOOTER_CONTENT_RESERVE_PX,
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

describe("computeHeaderReserve", () => {
  test("0 when the header is hidden", () => {
    expect(computeHeaderReserve({ showHeader: false, avatar: "x", nickname: "n" })).toBe(0);
  });

  test("base reserve when no profile info is set (eyebrow only)", () => {
    expect(computeHeaderReserve({})).toBe(HEADER_RESERVE_BASE_PX);
  });

  test("text-only profile reserves more than base (guards subtitle overlap)", () => {
    const textOnly = computeHeaderReserve({ nickname: "Viy", handle: "viy", subtitle: "sss" });
    expect(textOnly).toBeGreaterThan(HEADER_RESERVE_BASE_PX);
  });

  test("reserve grows with the chrome font size", () => {
    const small = computeHeaderReserve({ avatar: "x", nickname: "Viy" }, 22);
    const large = computeHeaderReserve({ avatar: "x", nickname: "Viy" }, 32);
    expect(large).toBeGreaterThan(small);
  });

  test("adding a subtitle line grows the reserve", () => {
    const two = computeHeaderReserve({ nickname: "Viy", handle: "viy" }, 22);
    const three = computeHeaderReserve({ nickname: "Viy", handle: "viy", subtitle: "s" }, 22);
    expect(three).toBeGreaterThan(two);
  });
});

describe("footerReservePx", () => {
  test("reserves when shown, nothing when hidden", () => {
    expect(footerReservePx(true)).toBe(FOOTER_CONTENT_RESERVE_PX);
    expect(footerReservePx(false)).toBe(0);
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

describe("reserves are published to the card element", () => {
  test("header reserve matches computeHeaderReserve for the shown profile", () => {
    const user = { avatar: "app://abc/x.png", nickname: "Viy" };
    const { card } = renderWithUser(user);
    expect(card.style.getPropertyValue("--header-reserve")).toBe(`${computeHeaderReserve(user)}px`);
  });

  test("base reserve when no profile info is set", () => {
    const { card } = renderWithUser({});
    expect(card.style.getPropertyValue("--header-reserve")).toBe(`${HEADER_RESERVE_BASE_PX}px`);
  });

  test("zero header reserve when the header is hidden", () => {
    const { card } = renderWithUser({ showHeader: false });
    expect(card.style.getPropertyValue("--header-reserve")).toBe("0px");
  });

  test("footer reserve zeroes out when the footer is hidden", () => {
    expect(renderWithUser({ showFooter: false }).card.style.getPropertyValue("--footer-reserve")).toBe("0px");
    expect(renderWithUser({ nickname: "Viy" }).card.style.getPropertyValue("--footer-reserve")).toBe(
      `${FOOTER_CONTENT_RESERVE_PX}px`
    );
  });
});
