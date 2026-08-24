import { describe, expect, test } from "bun:test";
import { paginateMeasured } from "../pagination-engine";
import { LINE_HEIGHT, makeContext, paragraph } from "./pagination-helpers";

// CUT_UNSAFE 只保护 refine 窗口，粗切点（行边界）仍可能落进 **…** 内部，
// 把开闭标记拆到两页，各自落单渲染成字面星号。真实案例：一段结尾带加粗
// 判断句的正文，分页后卡片上出现裸 ** 且加粗失效。
describe("粗切点不劈开行内 markdown span", () => {
  const available = 4 * LINE_HEIGHT;

  // 三种偏移让行边界分别落在 span 开头、内部、闭合标记上。
  const offsets = [17, 18, 19];

  test.each(offsets)("前置 %d 字时每页星号成对", (n) => {
    const content = "字".repeat(n) + "**重点句子标记**" + "字".repeat(20);
    const pages = paginateMeasured([paragraph(content)], makeContext(available));

    for (const page of pages) {
      for (const block of page.blocks) {
        const stars = (block.content.match(/\*/g) ?? []).length;
        expect(stars % 2).toBe(0);
      }
    }
  });

  test.each(offsets)("前置 %d 字时加粗 span 完整落在同一页", (n) => {
    const content = "字".repeat(n) + "**重点句子标记**" + "字".repeat(20);
    const pages = paginateMeasured([paragraph(content)], makeContext(available));

    const carrier = pages.filter((p) =>
      p.blocks.some((b) => b.content.includes("**重点句子标记**"))
    );
    expect(carrier).toHaveLength(1);
  });

  test.each(offsets)("前置 %d 字时切点避让不吞字也不重复", (n) => {
    const content = "字".repeat(n) + "**重点句子标记**" + "字".repeat(20);
    const pages = paginateMeasured([paragraph(content)], makeContext(available));

    const joined = pages
      .flatMap((p) => p.blocks.map((b) => b.content))
      .join("");
    expect(joined).toBe(content);
  });

  test("整段加粗超出剩余空间时整段下推，不从中间劈开", () => {
    const content = "**" + "全段都是加粗内容".repeat(4) + "**";
    const pages = paginateMeasured([paragraph(content)], makeContext(available));

    expect(pages).toHaveLength(1);
    expect(pages[0].blocks[0].content).toBe(content);
  });

  test("删除线 span 同样不被劈开", () => {
    const content = "字".repeat(18) + "~~划掉的句子~~" + "字".repeat(20);
    const pages = paginateMeasured([paragraph(content)], makeContext(available));

    const carrier = pages.filter((p) =>
      p.blocks.some((b) => b.content.includes("~~划掉的句子~~"))
    );
    expect(carrier).toHaveLength(1);
  });
});
