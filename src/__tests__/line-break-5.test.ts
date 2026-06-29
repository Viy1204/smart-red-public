import { test, expect, describe } from "bun:test";
import { breakLines } from "../cjk-line-breaker";
function texts(lines: any[]): string[] { return lines.map((l) => l.text); }

describe("batch 5", () => {
  test("t81", () => { const text = "한글텍스트입니다"; const lines = breakLines(text, 8); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t82", () => { const lines = breakLines("abc", 2); expect(lines.map(l => l.text).join("")).toBe("abc"); });
  test("t83", () => { const lines = breakLines("你好", 2); expect(texts(lines)).toEqual(["你", "好"]); });
  test("t84", () => { const text = "https://example.com"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t85", () => { const text = "1234567890"; const lines = breakLines(text, 5); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t86", () => expect(breakLines("", 10, "Arial")).toEqual([]));
  test("t87", () => { const lines = breakLines("注意：重要事项", 8); expect(lines.map(l => l.text).join("")).toBe("注意：重要事项"); });
  test("t88", () => { const lines = breakLines("第一；第二；第三", 8); expect(lines.map(l => l.text).join("")).toBe("第一；第二；第三"); });
  test("t89", () => { const text = "（圆括号）[方括号]【方头括号】"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t90", () => { const text = "https://example.com/very/long/path/to/resource"; const lines = breakLines(text, 20); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t91", () => { const text = "什么？！真的吗？！"; const lines = breakLines(text, 8); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t92", () => { const text = "价格3.14元"; const lines = breakLines(text, 6); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t93", () => { const text = "contact@example.com"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t94", () => { const text = "春眠不觉晓处处闻啼鸟夜来风雨声花落知多少"; const lines = breakLines(text, 8); for (const line of lines) expect(line.width).toBeLessThanOrEqual(8); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t95", () => { const text = "中华人民共和国万岁"; const lines = breakLines(text, 6); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t96", () => { const lines = breakLines("这是一个很长的中文句子用来测试断行功能", 12); expect(lines.length).toBeGreaterThan(1); for (const line of lines) expect(line.width).toBeLessThanOrEqual(12); });
  test("t97", () => { const lines = breakLines("今天天气很好", 6); expect(texts(lines)).toEqual(["今天天", "气很好"]); });
  test("t98", () => { const lines = breakLines("你好世界", 10); expect(texts(lines)).toEqual(["你好世界"]); });
  test("t99", () => { const lines = breakLines("hello", 10); expect(texts(lines)).toEqual(["hello"]); expect(lines.map(l => l.width)).toEqual([5]); });
  test("t100", () => { const lines = breakLines("你好世界", 10); expect(texts(lines)).toEqual(["你好世界"]); expect(lines.map(l => l.width)).toEqual([8]); });
});
