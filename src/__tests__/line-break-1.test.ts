import { test, expect, describe } from "bun:test";
import { breakLines, getBreakOpportunities, isProhibitedAtStart, isProhibitedAtEnd } from "../cjk-line-breaker";
function texts(lines: any[]): string[] { return lines.map((l) => l.text); }

describe("batch 1", () => {
  test("t1", () => expect(breakLines("", 10)).toEqual([]));
  test("t2", () => expect(() => breakLines("hello", 0)).toThrow());
  test("t3", () => expect(texts(breakLines("a", 1))).toEqual(["a"]));
  test("t4", () => expect(texts(breakLines("中", 2))).toEqual(["中"]));
  test("t5", () => expect(texts(breakLines("hello", 10))).toEqual(["hello"]));
  test("t6", () => expect(texts(breakLines("你好世界", 4))).toEqual(["你好", "世界"]));
  test("t7", () => expect(texts(breakLines("hello world", 10))).toEqual(["hello ", "world"]));
  test("t8", () => expect(texts(breakLines("使用JavaScript编程", 10))).toEqual(["使用", "JavaScript", "编程"]));
  test("t9", () => { const lines = breakLines("这是测试。还有更多。", 8); for (const line of lines) expect(line.text.startsWith("。")).toBe(false); });
  test("t10", () => { const lines = breakLines("这是（测试）内容", 6); for (const line of lines) expect(line.text.endsWith("（")).toBe(false); });
  test("t11", () => expect(texts(breakLines("20240101", 6))).toEqual(["202401", "01"]));
  test("t12", () => { const text = "访问 https://example.com/path 获取信息"; const lines = breakLines(text, 20); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t13", () => expect(isProhibitedAtStart("。")).toBe(true));
  test("t14", () => expect(isProhibitedAtEnd("（")).toBe(true));
  test("t15", () => expect(getBreakOpportunities("hello").length).toBeGreaterThan(0));
  test("t16", () => expect(texts(breakLines("a".repeat(100), 10)).length).toBe(10));
  test("t17", () => expect(texts(breakLines("中".repeat(100), 10)).length).toBe(20));
  test("t18", () => expect(texts(breakLines("Hello世界", 8)).join("")).toBe("Hello世界"));
  test("t19", () => expect(texts(breakLines("价格100元", 6)).join("")).toBe("价格100元"));
  test("t20", () => expect(texts(breakLines("第1章 Chapter One", 10)).join("")).toBe("第1章 Chapter One"));
});
