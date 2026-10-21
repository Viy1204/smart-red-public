import "./dom-setup";
import { describe, expect, test } from "bun:test";
import { TemplateRenderer } from "../template-renderer";
import { editorialTemplate } from "../templates/gallery";
import { BlockType } from "../types";
import type { PaginationDecision } from "../pagination-engine";

function makePage(): PaginationDecision {
  return {
    pageIndex: 0,
    blocks: [{ type: BlockType.Paragraph, content: "边距测试" }],
    hasContinuation: false,
  };
}

describe("side padding", () => {
  test("passes a custom side padding to the card as --pad-x", () => {
    const container = document.createElement("div");
    const card = new TemplateRenderer().renderExportCard(
      container,
      makePage().blocks,
      makePage(),
      editorialTemplate,
      { sidePadding: 100 }
    );

    expect(card.style.getPropertyValue("--pad-x")).toBe("100px");
  });

  test("omits --pad-x when the template default is used", () => {
    const container = document.createElement("div");
    const card = new TemplateRenderer().renderExportCard(
      container,
      makePage().blocks,
      makePage(),
      editorialTemplate,
      { sidePadding: 0 }
    );

    expect(card.style.getPropertyValue("--pad-x")).toBe("");
  });
});
