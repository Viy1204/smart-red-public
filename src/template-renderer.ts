import type { SemanticBlock } from "./types";
import type { PaginationDecision } from "./pagination-engine";
import type { Template, TemplateRenderContext } from "./templates/types";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1440;

// Single source of truth for the chrome height the content budget reserves.
// Both the template CSS (gallery.ts padding) and the pagination budget
// (view.ts getAvailableContentHeight) must agree, so they import from here.
export const HEADER_RESERVE_BASE_PX = 36;
export const HEADER_RESERVE_AVATAR_PX = 104;
export const FOOTER_CONTENT_RESERVE_PX = 42;

export function headerReservePx(showHeader: boolean, hasAvatar: boolean): number {
  if (!showHeader) return 0;
  return hasAvatar ? HEADER_RESERVE_AVATAR_PX : HEADER_RESERVE_BASE_PX;
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
    const showHeader = context?.user?.showHeader !== false;
    const hasAvatar = !!(context?.user?.avatar && context.user.avatar.trim());
    cardEl.setCssProps({ "--header-reserve": `${headerReservePx(showHeader, hasAvatar)}px` });
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
