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

export class TemplateRenderer {
  private createStyleElement(template: Template): HTMLStyleElement {
    const styleEl = document.createElement("style");
    styleEl.textContent = template.styles;
    return styleEl;
  }

  private createCardElement(
    blocks: SemanticBlock[],
    page: PaginationDecision,
    template: Template,
    context?: TemplateRenderContext
  ): HTMLElement {
    const cardEl = document.createElement("div");
    cardEl.className = template.cardClassName;
    cardEl.style.width = `${CARD_WIDTH}px`;
    cardEl.style.height = `${CARD_HEIGHT}px`;
    cardEl.style.boxSizing = "border-box";
    cardEl.style.overflow = "hidden";
    cardEl.style.backgroundColor = template.backgroundColor;
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
    cardEl.style.setProperty("--header-reserve", `${headerReservePx(showHeader, hasAvatar)}px`);
    if (fontSize) {
      cardEl.style.fontSize = `${fontSize}px`;
    }
    if (chromeFontSize) {
      cardEl.style.setProperty("--chrome-size", `${chromeFontSize}px`);
    }
    if (theme?.fontFamily) {
      cardEl.style.setProperty("--body-font", theme.fontFamily);
      cardEl.style.setProperty("--display", theme.fontFamily);
      cardEl.style.setProperty("--caption", theme.fontFamily);
    }
    if (theme?.textColor) {
      cardEl.style.setProperty("--body", theme.textColor);
      cardEl.style.setProperty("--heading", theme.textColor);
    }
    if (theme?.backgroundColor) {
      cardEl.style.setProperty("--paper", theme.backgroundColor);
      cardEl.style.backgroundColor = theme.backgroundColor;
    } else {
      cardEl.style.backgroundColor = template.backgroundColor;
    }
    if (theme?.accentColor) {
      cardEl.style.setProperty("--accent", theme.accentColor);
      cardEl.style.setProperty("--accent-soft", theme.accentColor);
    }
    if (typeof theme?.spacing === "number" && theme.spacing > 0) {
      cardEl.style.setProperty("--para-gap", `${theme.spacing}px`);
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

    shadow.appendChild(this.createStyleElement(template));
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
    container.style.width = `${CARD_WIDTH}px`;
    container.style.height = `${CARD_HEIGHT}px`;
    container.style.backgroundColor = context?.theme?.backgroundColor || template.backgroundColor;
    container.style.overflow = "hidden";
    container.style.boxSizing = "border-box";

    container.appendChild(this.createStyleElement(template));
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
