import "./dom-setup";
import { describe, test, expect } from "bun:test";
import {
	ExportPipeline,
	includeStyleProperties,
	isLikelyBlankImageData,
	DEFAULT_EXPORT_CONFIG,
	pageFileName,
} from "../export-pipeline";

describe("includeStyleProperties", () => {
	test("excludes CSS custom properties starting with --", () => {
		expect(includeStyleProperties("--card-bg")).toBe(false);
		expect(includeStyleProperties("--accent-color")).toBe(false);
		expect(includeStyleProperties("--")).toBe(false);
	});

	test("includes regular CSS properties", () => {
		expect(includeStyleProperties("color")).toBe(true);
		expect(includeStyleProperties("background-color")).toBe(true);
		expect(includeStyleProperties("font-size")).toBe(true);
		expect(includeStyleProperties("margin-top")).toBe(true);
	});
});

describe("ExportPipeline instantiation", () => {
	test("creates pipeline with default config", () => {
		const pipeline = new ExportPipeline();
		expect(pipeline).toBeDefined();
	});

	test("creates pipeline with custom config overrides", () => {
		const pipeline = new ExportPipeline({ pixelRatio: 3 });
		expect(pipeline).toBeDefined();
	});
});

describe("DEFAULT_EXPORT_CONFIG", () => {
	test("has correct default values", () => {
		expect(DEFAULT_EXPORT_CONFIG.quality).toBe(1);
		expect(DEFAULT_EXPORT_CONFIG.pixelRatio).toBe(2);
		expect(DEFAULT_EXPORT_CONFIG.skipFonts).toBe(false);
		expect(DEFAULT_EXPORT_CONFIG.cacheBust).toBe(true);
	});
});

describe("pageFileName", () => {
	test("generates correct Chinese file names", () => {
		expect(pageFileName(0)).toBe("小红书笔记_第1页.png");
		expect(pageFileName(1)).toBe("小红书笔记_第2页.png");
		expect(pageFileName(4)).toBe("小红书笔记_第5页.png");
	});
});

describe("isLikelyBlankImageData", () => {
	test("detects a flat opaque image as blank", () => {
		const data = new Uint8ClampedArray(4 * 4 * 4);
		for (let i = 0; i < data.length; i += 4) {
			data[i] = 0;
			data[i + 1] = 0;
			data[i + 2] = 0;
			data[i + 3] = 255;
		}

		expect(isLikelyBlankImageData(data, 4, 4)).toBe(true);
	});

	test("keeps an image with visible variation", () => {
		const data = new Uint8ClampedArray(4 * 4 * 4);
		for (let i = 0; i < data.length; i += 4) {
			data[i] = 245;
			data[i + 1] = 239;
			data[i + 2] = 227;
			data[i + 3] = 255;
		}
		data[0] = 40;
		data[1] = 35;
		data[2] = 28;

		expect(isLikelyBlankImageData(data, 4, 4)).toBe(false);
	});
});
