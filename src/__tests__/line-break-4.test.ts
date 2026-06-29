import { test, expect, describe } from "bun:test";
import { breakLines } from "../cjk-line-breaker";
function texts(lines: any[]): string[] { return lines.map((l) => l.text); }

describe("batch 4", () => {
  test("t61", () => expect(texts(breakLines(" ", 1))).toEqual([" "]));
  test("t62", () => { const text = "你好，世界！今天天气（真）不错。"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); for (const line of lines) expect(line.width).toBeLessThanOrEqual(10); });
  test("t63", () => { const lines = breakLines("Ｈｅｌｌｏ", 10); expect(texts(lines)).toEqual(["Ｈｅｌｌｏ"]); });
  test("t64", () => { const lines = breakLines("ｱｲｳｴｵ", 5); expect(texts(lines)).toEqual(["ｱｲｳｴｵ"]); });
  test("t65", () => { const lines = breakLines("hello👋world", 10); expect(lines.map(l => l.text).join("")).toBe("hello👋world"); });
  test("t66", () => { const text = "hello\u200bworld"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t67", () => { const lines = breakLines("abc", 1); expect(lines.length).toBeGreaterThan(1); expect(lines.map(l => l.text).join("")).toBe("abc"); });
  test("t68", () => { const text = "！！！！！！"; const lines = breakLines(text, 4); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t69", () => { const lines = breakLines("。开始", 4); expect(lines[0].text).toBe("。开"); });
  test("t70", () => { const lines = breakLines("结束（", 4); expect(lines[lines.length - 1].text).toBe("（"); });
  test("t71", () => { const lines = breakLines("Hello世界", 8); expect(lines.map(l => l.text).join("")).toBe("Hello世界"); });
  test("t72", () => { const lines = breakLines("世界Hello", 8); expect(lines.map(l => l.text).join("")).toBe("世界Hello"); });
  test("t73", () => { const text = "a b c d e f g"; const lines = breakLines(text, 3); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t74", () => { const text = "The quick brown fox jumps over the lazy dog while the CJK text 快速棕色狐狸跳过懒狗 is mixed"; const lines = breakLines(text, 16); for (const line of lines) expect(line.width).toBeLessThanOrEqual(16); });
  test("t75", () => expect(texts(breakLines("5", 1))).toEqual(["5"]));
  test("t76", () => expect(texts(breakLines("55", 1))).toEqual(["5", "5"]));
  test("t77", () => { const text = "Hello, world! 你好世界。"; const lines = breakLines(text, 12); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t78", () => { const text = "!@#$%^&*()_+-=[]{}|;':\",./<>?"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t79", () => { const text = "第1章 Chapter One"; const lines = breakLines(text, 10); expect(lines.map(l => l.text).join("")).toBe(text); });
  test("t80", () => { const text = "ひらがなです"; const lines = breakLines(text, 6); expect(lines.map(l => l.text).join("")).toBe(text); });
});
