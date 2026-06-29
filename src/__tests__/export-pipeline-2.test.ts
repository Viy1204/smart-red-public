import "./dom-setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { ExportPipeline } from "../export-pipeline";

beforeEach(() => {
	if (!(globalThis as any).document?.fonts) {
		(globalThis as any).document.fonts = { ready: Promise.resolve() };
	}
});

describe("ExportPipeline fallback logic", () => {
	test("exportSinglePage throws when both renderers fail", async () => {
		const pipeline = new ExportPipeline();
		const container = document.createElement("div");
		container.innerHTML = "<p>test</p>";

		await expect(
			pipeline.exportSinglePage(container, 0),
		).rejects.toThrow("Export failed for page 0");
	});
});

describe("ExportPipeline renderWithHtml2Canvas", () => {
	test("renderWithHtml2Canvas returns null on html2canvas error", async () => {
		const pipeline = new ExportPipeline();
		const container = document.createElement("div");
		const result = await (pipeline as any).renderWithHtml2Canvas(container);
		expect(result).toBeNull();
	});
});

describe("ExportPipeline config merging", () => {
	test("partial config merges with defaults", () => {
		const pipeline = new ExportPipeline({ quality: 0.8 });
		const config = (pipeline as any).config;
		expect(config.quality).toBe(0.8);
		expect(config.pixelRatio).toBe(2);
		expect(config.cacheBust).toBe(true);
	});
});