import type { SemanticBlock } from "../types";
import type { PaginationDecision } from "../pagination-engine";

export interface TemplateUserInfo {
  avatar: string;
  nickname: string;
  handle: string;
  subtitle: string;
  footer: string;
  showHeader: boolean;
  showFooter: boolean;
  roundAvatar: boolean;
  verifiedBadge: boolean;
}

export interface TemplateThemeOverrides {
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  accentColor: string;
  boldColor: string;
  h1Color: string;
  h2Color: string;
  h3Color: string;
  spacing: number;
}

export interface TemplateRenderContext {
  fontSize?: number;
  chromeFontSize?: number;
  user?: Partial<TemplateUserInfo>;
  theme?: Partial<TemplateThemeOverrides>;
  sectionTitle?: string;
  // Blank reserve at the very top of every card so Xiaohongshu's AI-content
  // banner overlays empty space instead of the header/first line.
  topSafeArea?: number;
}

export interface Template {
  name: string;
  displayName: string;
  cardClassName: string;
  cardPadding: number;
  baseFontSize: number;
  lineHeightRatio: number;
  backgroundColor: string;
  styles: string;
  layout(
    el: HTMLElement,
    blocks: SemanticBlock[],
    page: PaginationDecision,
    context?: TemplateRenderContext
  ): void;
}
