import type { SemanticBlock } from "./types";
import type { PaginationDecision } from "./pagination-engine";
import type { Template, TemplateRenderContext, TemplateUserInfo } from "./templates/types";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1440;

// Single source of truth for the chrome height the content budget reserves.
// Both the template CSS (gallery.ts padding) and the pagination budget
// (view.ts getAvailableContentHeight) must agree — the CSS uses these as the
// var() fallbacks and the renderer/view compute the exact value below.
export const HEADER_RESERVE_BASE_PX = 36;
export const FOOTER_CONTENT_RESERVE_PX = 42;

type ProfileUser = Partial<
  Pick<TemplateUserInfo, "showHeader" | "showFooter" | "avatar" | "nickname" | "handle" | "subtitle">
>;

const has = (v: string | undefined) => !!(v && v.trim());

// The profile header height scales with the chrome font size (avatar = 2.9x,
// text lines ± a few px) and with how many of nickname/handle/subtitle are set.
// A fixed reserve either overlaps the body (too small) or strands whitespace
// (too big, shrinking the page budget), so compute the real height + breathing.
export function computeHeaderReserve(user: ProfileUser | undefined, chromeFontSize = 22): number {
  if (user?.showHeader === false) return 0;
  const c = chromeFontSize || 22;
  const avatar = has(user?.avatar);
  if (!avatar && !has(user?.nickname) && !has(user?.handle) && !has(user?.subtitle)) {
    return HEADER_RESERVE_BASE_PX;
  }
  const lineFs: number[] = [];
  if (has(user?.nickname)) lineFs.push(c + 4);
  if (has(user?.handle)) lineFs.push(c - 1);
  if (has(user?.subtitle)) lineFs.push(c - 4);
  const textCol =
    lineFs.reduce((sum, fs) => sum + fs * 1.3, 0) + Math.max(0, lineFs.length - 1) * 5;
  const avatarPx = avatar ? c * 2.9 : 0;
  return Math.round(Math.max(avatarPx, textCol) + 24);
}

export function footerReservePx(showFooter: boolean): number {
  return showFooter ? FOOTER_CONTENT_RESERVE_PX : 0;
}

// Cache constructable stylesheets per template so we don't rebuild them.
const stylesheetCache = new Map<string, CSSStyleSheet>();

function getStylesheet(template: Template): CSSStyleSheet {
  let sheet = stylesheetCache.get(template.name);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(template.styles);
    stylesheetCache.set(template.name, sheet);
  }
  return sheet;
}

export class TemplateRenderer {
  private createCardElement(
    blocks: SemanticBlock[],
    page: PaginationDecision,
    template: Template,
    context?: TemplateRenderContext
  ): HTMLElement {
    const cardEl = document.createElement("div");
    cardEl.className = template.cardClassName;
    cardEl.setCssStyles({
      width: `${CARD_WIDTH}px`,
      height: `${CARD_HEIGHT}px`,
      boxSizing: "border-box",
      overflow: "hidden",
      backgroundColor: template.backgroundColor,
    });
    this.applyContextStyles(cardEl, template, context);

    template.layout(cardEl, blocks, page, context);
    return cardEl;
  }

  private applyContextStyles(
    cardEl: HTMLElement,
    template: Template,
    context?: TemplateRenderContext
  ): void {
    const theme = context?.theme;
    const fontSize = context?.fontSize;
    const chromeFontSize = context?.chromeFontSize;
    cardEl.setCssProps({
      "--header-reserve": `${computeHeaderReserve(context?.user, context?.chromeFontSize)}px`,
      "--footer-reserve": `${footerReservePx(context?.user?.showFooter !== false)}px`,
      "--top-safe": `${Math.max(0, context?.topSafeArea ?? 0)}px`,
    });
    if (fontSize) {
      cardEl.setCssStyles({ fontSize: `${fontSize}px` });
    }
    if (chromeFontSize) {
      cardEl.setCssProps({ "--chrome-size": `${chromeFontSize}px` });
    }
    if (theme?.fontFamily) {
      cardEl.setCssProps({
        "--body-font": theme.fontFamily,
        "--display": theme.fontFamily,
        "--caption": theme.fontFamily,
      });
    }
    if (theme?.textColor) {
      cardEl.setCssProps({
        "--body": theme.textColor,
        "--heading": theme.textColor,
      });
    }
    if (theme?.backgroundColor) {
      cardEl.setCssProps({ "--paper": theme.backgroundColor });
      cardEl.setCssStyles({ backgroundColor: theme.backgroundColor });
    } else {
      cardEl.setCssStyles({ backgroundColor: template.backgroundColor });
    }
    if (theme?.accentColor) {
      cardEl.setCssProps({
        "--accent": theme.accentColor,
        "--accent-soft": theme.accentColor,
      });
    }
    if (theme?.boldColor) {
      cardEl.setCssProps({ "--strong-color": theme.boldColor });
    }
    if (theme?.h1Color) cardEl.setCssProps({ "--h1-color": theme.h1Color });
    if (theme?.h2Color) cardEl.setCssProps({ "--h2-color": theme.h2Color });
    if (theme?.h3Color) cardEl.setCssProps({ "--h3-color": theme.h3Color });
    if (typeof theme?.spacing === "number" && theme.spacing > 0) {
      cardEl.setCssProps({ "--para-gap": `${theme.spacing}px` });
    }
  }

  /**
   * Render a single card inside a container element using Shadow DOM.
   * Returns the ShadowRoot for further manipulation or export.
   */
  renderCard(
    container: HTMLElement,
    blocks: SemanticBlock[],
    page: PaginationDecision,
    template: Template,
    context?: TemplateRenderContext
  ): ShadowRoot {
    const shadow = container.attachShadow({ mode: "open" });

    shadow.adoptedStyleSheets = [getStylesheet(template)];
    shadow.appendChild(this.createCardElement(blocks, page, template, context));

    return shadow;
  }

  /**
   * Render a single card into ordinary light DOM for export/copy.
   * html-to-image and html2canvas do not reliably serialize Shadow DOM hosts.
   */
  renderExportCard(
    container: HTMLElement,
    blocks: SemanticBlock[],
    page: PaginationDecision,
    template: Template,
    context?: TemplateRenderContext
  ): HTMLElement {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.setCssStyles({
      width: `${CARD_WIDTH}px`,
      height: `${CARD_HEIGHT}px`,
      backgroundColor: context?.theme?.backgroundColor || template.backgroundColor,
      overflow: "hidden",
      boxSizing: "border-box",
    });

    const cardEl = this.createCardElement(blocks, page, template, context);
    container.appendChild(cardEl);
    return cardEl;
  }

  /**
   * Render all pagination decisions as separate cards.
   * Each card gets its own container with Shadow DOM isolation.
   * Returns an array of ShadowRoots.
   */
  renderAllCards(
    parent: HTMLElement,
    decisions: PaginationDecision[],
    blocks: SemanticBlock[],
    template: Template,
    context?: TemplateRenderContext
  ): ShadowRoot[] {
    const roots: ShadowRoot[] = [];

    for (const page of decisions) {
      const pageBlocks = page.blocks;
      const wrapper = document.createElement("div");
      parent.appendChild(wrapper);

      const shadow = this.renderCard(wrapper, pageBlocks, page, template, context);
      roots.push(shadow);
    }

    return roots;
  }
}
