import { test, expect, describe } from "bun:test";
import { breakLines, getBreakOpportunities } from "../cjk-line-breaker";
function texts(lines: any[]): string[] { return lines.map((l) => l.text); }

describe("batch 3", () => {
  test("t41", () => { const lines = breakLines("这是《测试》内容", 6); for (const line of lines) expect(line.text.endsWith("《")).toBe(false); });
  test("t42", () => { const lines = breakLines("这是〈测试〉内容", 6); for (const line of lines) expect(line.text.endsWith("〈")).toBe(false); });
  test("t43", () => { const lines = breakLines("这是【测试】内容", 6); for (const line of lines) expect(line.text.endsWith("【")).toBe(false); });
  test("t44", () => { const text = "访问 www.example.com/page 获取信息"; const lines = breakLines(text, 20); for (const line of lines) { const trimmed = line.text.trim(); if (trimmed.includes("www")) expect(trimmed).toContain("www.example.com/page"); } });
  test("t45", () => { const text = "请查看 https://github.com/user/repo"; const lines = breakLines(text, 20); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t46", () => { const lines = breakLines("数字12345678在这里", 10); for (const line of lines) expect(line.text).not.toMatch(/\d+\n\d+/); expect(lines.map(l => l.text).join("")).toBe("数字12345678在这里"); });
  test("t47", () => { const lines = breakLines("价格100元", 6); expect(lines.map(l => l.text).join("")).toBe("价格100元"); });
  test("t48", () => { const text = "2024年1月1日"; const lines = breakLines(text, 8); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t49", () => { const lines = breakLines("苹果，香蕉，橙子", 6); expect(lines.map(l => l.text).join("")).toBe("苹果，香蕉，橙子"); });
  test("t50", () => { const lines = breakLines("这是测试。还有更多。", 8); for (const line of lines) expect(line.text.startsWith("。")).toBe(false); });
  test("t51", () => expect(getBreakOpportunities("hello world").length).toBeGreaterThan(0));
  test("t52", () => expect(getBreakOpportunities("你好世界").length).toBeGreaterThan(0));
  test("t53", () => { const text = "hello world"; const ops = getBreakOpportunities(text); expect(ops[ops.length - 1]).toBe(text.length); });
  test("t54", () => { const lines = breakLines("    ", 4); expect(lines.map(l => l.text).join("")).toBe("    "); });
  test("t55", () => { const lines = breakLines("a\tb\tc", 4); expect(lines.map(l => l.text).join("")).toBe("a\tb\tc"); });
  test("t56", () => { const text = "line1\nline2\nline3"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t57", () => { const text = "中".repeat(100); const lines = breakLines(text, 10); expect(lines.length).toBe(20); for (const line of lines) expect(line.width).toBeLessThanOrEqual(10); });
  test("t58", () => { const text = "a".repeat(100); const lines = breakLines(text, 10); expect(lines.length).toBe(10); for (const line of lines) expect(line.width).toBeLessThanOrEqual(10); });
  test("t59", () => expect(texts(breakLines("hello", 5))).toEqual(["hello"]));
  test("t60", () => expect(texts(breakLines("你好", 4))).toEqual(["你好"]));
});
