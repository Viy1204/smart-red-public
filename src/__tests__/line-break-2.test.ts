import { test, expect, describe } from "bun:test";
import { breakLines, isProhibitedAtStart, isProhibitedAtEnd } from "../cjk-line-breaker";
function texts(lines: any[]): string[] { return lines.map((l) => l.text); }

describe("batch 2", () => {
  test("t21", () => expect(texts(breakLines("hello world foo bar", 10))).toEqual(["hello ", "world foo ", "bar"]));
  test("t22", () => expect(texts(breakLines("hello world", 5))).toEqual(["hello", " ", "world"]));
  test("t23", () => { const text = "The quick brown fox jumps over the lazy dog repeatedly without stopping"; const lines = breakLines(text, 20); for (const line of lines) expect(line.width).toBeLessThanOrEqual(20); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t24", () => expect(texts(breakLines("internationalization", 10))).toEqual(["internatio", "nalization"]));
  test("t25", () => { const lines = breakLines("supercalifragilisticexpialidocious", 10); expect(lines.length).toBeGreaterThan(1); expect(lines.map(l => l.text).join("")).toBe("supercalifragilisticexpialidocious"); });
  test("t26", () => { const lines = breakLines("这是Chinese和English混合的text内容", 12); expect(lines.length).toBeGreaterThan(1); expect(lines.map(l => l.text).join("")).toBe("这是Chinese和English混合的text内容"); });
  test("t27", () => { const lines = breakLines("使用JavaScript编程", 10); const joined = texts(lines).join(""); expect(joined).toBe("使用JavaScript编程"); for (const line of lines) { expect(line.text).not.toMatch(/^JavaScrip$/); expect(line.text).not.toMatch(/^cript$/); } });
  test("t28", () => { const lines = breakLines("Hello你好World世界", 8); expect(lines.map(l => l.text).join("")).toBe("Hello你好World世界"); for (const line of lines) expect(line.width).toBeLessThanOrEqual(8); });
  test("t29", () => { const lines = breakLines("API接口设计", 8); expect(lines.map(l => l.text).join("")).toBe("API接口设计"); });
  test("t30", () => { const lines = breakLines("设计模式MVC", 8); expect(lines.map(l => l.text).join("")).toBe("设计模式MVC"); });
  test("t31", () => { const text = "使用React和Vue框架开发Web应用"; const lines = breakLines(text, 14); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t32", () => { const lines = breakLines("苹果、香蕉、橙子、葡萄", 8); for (const line of lines) expect(line.text.startsWith("。")).toBe(false); });
  test("t33", () => { const lines = breakLines("太好了！真的太好了！", 8); for (const line of lines) expect(line.text.startsWith("！")).toBe(false); });
  test("t34", () => { const lines = breakLines("什么？你说什么？", 8); for (const line of lines) expect(line.text.startsWith("？")).toBe(false); });
  test("t35", () => { const lines = breakLines("（测试）内容", 6); for (const line of lines) expect(line.text.startsWith("）")).toBe(false); });
  test("t36", () => { const lines = breakLines("「测试」内容", 6); for (const line of lines) expect(line.text.startsWith("」")).toBe(false); });
  test("t37", () => { const lines = breakLines("『测试』内容", 6); for (const line of lines) expect(line.text.startsWith("』")).toBe(false); });
  test("t38", () => { const lines = breakLines('他说"你好"', 6); for (const line of lines) expect(line.text.startsWith('"')).toBe(false); });
  test("t39", () => expect(isProhibitedAtStart("中")).toBe(false));
  test("t40", () => expect(isProhibitedAtEnd("中")).toBe(false));
});
