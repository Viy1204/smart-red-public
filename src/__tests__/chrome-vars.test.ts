import "./dom-setup";
import { describe, expect, test } from "bun:test";
import { editorialTemplate, warmSunTemplate } from "../templates/gallery";
import { computeHeaderReserve } from "../template-renderer";

// docs/warm-sun-layout-spec.md 把 chrome 的四个纯样式开关参数化成 CSS 变量，
// 约定「默认值复现原行为」——所以除 warm-sun 以外的模板必须一个覆盖都没有。
const WARM_SUN_OVERRIDES = [
  "--chrome-transform: none",
  "--chrome-rule: 0",
  "--chrome-title-size: 26px",
  "--chrome-title-lh: 1.35",
  "--chrome-title-wrap: normal",
  "--chrome-title-lines: 2",
  "--chrome-title-display: -webkit-box",
];

describe("chrome 差异化的 CSS 变量", () => {
  test("warm-sun 声明了全部 chrome 覆盖", () => {
    for (const override of WARM_SUN_OVERRIDES) {
      expect(warmSunTemplate.styles).toContain(override);
    }
  });

  test("其他模板不带任何 chrome 覆盖，行为保持原样", () => {
    for (const override of WARM_SUN_OVERRIDES) {
      expect(editorialTemplate.styles).not.toContain(override);
    }
  });

  test("共享 BASE_STYLES 的默认值复现原来的单行截断", () => {
    expect(warmSunTemplate.styles).toContain("text-transform: var(--chrome-transform, uppercase)");
    expect(warmSunTemplate.styles).toContain("border-bottom: var(--chrome-rule, 1px) solid var(--rule)");
    expect(warmSunTemplate.styles).toContain("border-top: var(--chrome-rule, 1px) solid var(--rule)");
    expect(warmSunTemplate.styles).toContain("white-space: var(--chrome-title-wrap, nowrap)");
    expect(warmSunTemplate.styles).toContain("-webkit-line-clamp: var(--chrome-title-lines, 1)");
  });

  // 标题原本和页脚共享一条 nowrap 声明；把标题拆出去时最容易顺手把页脚也
  // 改成换行，那会让页脚文字和页码折行。
  test("页脚仍然是单行截断，没被标题的换行波及", () => {
    expect(warmSunTemplate.styles).toContain(
      ".card-chrome.bottom > span {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}"
    );
  });
});

describe("名片头放大后的 header 预留", () => {
  const user = { avatar: "a.png", nickname: "Viy", handle: "viy", subtitle: "" };

  test("chromeFontSize 34 下预留 123px，由头像主导", () => {
    expect(computeHeaderReserve(user, 34, 0)).toBe(123);
  });

  test("预留随 chromeFontSize 单调不减", () => {
    const sizes = [22, 26, 30, 34, 36];
    const reserves = sizes.map((size) => computeHeaderReserve(user, size, 0));
    for (let i = 1; i < reserves.length; i += 1) {
      expect(reserves[i]).toBeGreaterThanOrEqual(reserves[i - 1]);
    }
  });
});
