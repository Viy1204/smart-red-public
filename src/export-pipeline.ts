import { toBlob } from "html-to-image";
import html2canvas from "html2canvas";
import { zip } from "fflate";

/**
 * Filter out CSS custom properties (--*) to avoid Chrome 138+ 5-10x slowdown.
 * Passed as includeStyleProperties to html-to-image config.
 */
export function includeStyleProperties(prop: string): boolean {
	return !prop.startsWith("--");
}

/** Export config for html-to-image / html2canvas */
export interface ExportConfig {
	quality: number;
	pixelRatio: number;
	skipFonts: boolean;
	cacheBust: boolean;
	includeStyleProperties: (prop: string) => boolean;
}

/** Default export config: 2160x2880px output (1080x1440 @ 2x) */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
	quality: 1,
	pixelRatio: 2,
	skipFonts: false,
	cacheBust: true,
	includeStyleProperties,
};

/** Strip characters that are illegal in file names across OSes. */
export function sanitizeFileName(name: string): string {
	const cleaned = (name || "")
		.replace(/[\\/:*?"<>|]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 60)
		.trim();
	return cleaned || "小红书笔记";
}

/** Exported page name: `<title>-01.png`. */
export function pageFileName(index: number, title?: string): string {
	return `${sanitizeFileName(title ?? "")}-${String(index + 1).padStart(2, "0")}.png`;
}

export function isLikelyBlankImageData(
	data: Uint8ClampedArray,
	width: number,
	height: number,
): boolean {
	if (width <= 0 || height <= 0 || data.length < 4) return true;

	let foundOpaquePixel = false;
	let minR = 255;
	let minG = 255;
	let minB = 255;
	let minA = 255;
	let maxR = 0;
	let maxG = 0;
	let maxB = 0;
	let maxA = 0;
	const pixelCount = width * height;
	const stride = Math.max(1, Math.floor(pixelCount / 4096));

	for (let pixel = 0; pixel < pixelCount; pixel += stride) {
		const offset = pixel * 4;
		const alpha = data[offset + 3];
		if (alpha <= 8) continue;
		foundOpaquePixel = true;
		const red = data[offset];
		const green = data[offset + 1];
		const blue = data[offset + 2];
		minR = Math.min(minR, red);
		minG = Math.min(minG, green);
		minB = Math.min(minB, blue);
		minA = Math.min(minA, alpha);
		maxR = Math.max(maxR, red);
		maxG = Math.max(maxG, green);
		maxB = Math.max(maxB, blue);
		maxA = Math.max(maxA, alpha);
	}

	if (!foundOpaquePixel) return true;
	return maxR - minR <= 3 && maxG - minG <= 3 && maxB - minB <= 3 && maxA - minA <= 3;
}

/**
 * ExportPipeline converts export cards to PNG images.
 *
 * Uses html-to-image as primary renderer with html2canvas fallback.
 * Applies double-invocation pattern for font embedding and
 * CSS variable filtering for Chrome 138+ performance.
 */
export class ExportPipeline {
	private config: ExportConfig;

	constructor(config?: Partial<ExportConfig>) {
		this.config = { ...DEFAULT_EXPORT_CONFIG, ...config };
	}

	/**
	 * Render a page container to a PNG Blob.
	 * Output dimensions: 2160x2880px (1080x1440 @ pixelRatio 2).
	 */
	async renderToBlob(
		container: HTMLElement,
		pageIndex: number,
	): Promise<Blob> {
		if (document.fonts && document.fonts.ready) {
			await document.fonts.ready;
		}
		await this.waitForImages(container);
		const blob = await this.renderToImage(container);
		if (!blob) {
			throw new Error(
				`Export failed for page ${pageIndex}: both renderers returned null`,
			);
		}
		await this.validateBlob(blob, pageIndex);
		return blob;
	}

	/**
	 * Export a single page container to a PNG Blob.
	 */
	async exportSinglePage(
		container: HTMLElement,
		pageIndex: number,
	): Promise<Blob> {
		return this.renderToBlob(container, pageIndex);
	}

	/**
	 * Export all page containers as a ZIP file.
	 * Each page is named: 小红书笔记_第N页.png
	 */
	async exportAllPages(containers: HTMLElement[], title?: string): Promise<Blob> {
		const files: Record<string, Uint8Array> = {};

		for (let i = 0; i < containers.length; i++) {
			const blob = await this.renderToBlob(containers[i], i);
			const array = new Uint8Array(await blob.arrayBuffer());
			files[pageFileName(i, title)] = array;
		}

		return new Promise((resolve, reject) => {
			zip(files, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(new Blob([data], { type: "application/zip" }));
				}
			});
		});
	}

	/**
	 * Render an element to a PNG Blob.
	 * Tries html-to-image first; falls back to html2canvas on failure.
	 */
	private async renderToImage(element: HTMLElement): Promise<Blob | null> {
		const blob = await this.renderWithHtmlToImage(element);
		if (blob) return blob;
		return this.renderWithHtml2Canvas(element);
	}

	/**
	 * html-to-image rendering with double-invocation pattern.
	 * First call embeds fonts, second call captures with fonts available.
	 */
	private async renderWithHtmlToImage(
		element: HTMLElement,
	): Promise<Blob | null> {
		const opts = {
			quality: this.config.quality,
			pixelRatio: this.config.pixelRatio,
			skipFonts: this.config.skipFonts,
			cacheBust: this.config.cacheBust,
			includeStyleProperties: this.config.includeStyleProperties,
		};

		try {
			await toBlob(element, opts);
		} catch {
			// Double-invocation: first call embeds fonts, may fail
		}
		try {
			const blob = await toBlob(element, opts);
			return blob;
		} catch {
			return null;
		}
	}

	/**
	 * html2canvas fallback renderer.
	 * Used when html-to-image fails or returns null.
	 */
	private async renderWithHtml2Canvas(
		element: HTMLElement,
	): Promise<Blob | null> {
		try {
			const canvas = await html2canvas(element, {
				scale: this.config.pixelRatio,
				useCORS: true,
				allowTaint: false,
				backgroundColor: this.findBackgroundColor(element),
			});

			return new Promise((resolve) => {
				canvas.toBlob(
					(blob) => resolve(blob),
					"image/png",
					this.config.quality,
				);
			});
		} catch {
			return null;
		}
	}

	private async validateBlob(blob: Blob, pageIndex: number): Promise<void> {
		if (blob.size <= 0) {
			throw new Error(`Export failed for page ${pageIndex}: renderer returned an empty PNG`);
		}
		if (blob.type && blob.type !== "image/png") {
			throw new Error(`Export failed for page ${pageIndex}: renderer returned ${blob.type}`);
		}
		if (await this.isLikelyBlankBlob(blob)) {
			throw new Error(`Export failed for page ${pageIndex}: renderer returned a blank PNG`);
		}
	}

	private async isLikelyBlankBlob(blob: Blob): Promise<boolean> {
		const createBitmap = (window as typeof window & {
			createImageBitmap?: (blob: Blob) => Promise<ImageBitmap>;
		}).createImageBitmap;
		if (!createBitmap || typeof document === "undefined") return false;

		let bitmap: ImageBitmap | null = null;
		try {
			bitmap = await createBitmap(blob);
			const canvas = document.createElement("canvas");
			canvas.width = 64;
			canvas.height = 64;
			const ctx = canvas.getContext("2d");
			if (!ctx) return false;
			ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			return isLikelyBlankImageData(imageData.data, imageData.width, imageData.height);
		} catch {
			return false;
		} finally {
			bitmap?.close?.();
		}
	}

	private async waitForImages(element: HTMLElement): Promise<void> {
		const images = this.collectImages(element);
		await Promise.all(
			images.map(async (img) => {
				if (img.complete && img.naturalWidth > 0) return;
				try {
					if (typeof img.decode === "function") {
						await img.decode();
						return;
					}
				} catch {
					// Fall through to the load/error race; failed images should not block export.
				}
				await new Promise<void>((resolve) => {
					const done = () => resolve();
					img.addEventListener("load", done, { once: true });
					img.addEventListener("error", done, { once: true });
					window.setTimeout(done, 2500);
				});
			}),
		);
	}

	private collectImages(root: HTMLElement | ShadowRoot): HTMLImageElement[] {
		const images = Array.from(root.querySelectorAll("img"));
		const shadowImages = Array.from(root.querySelectorAll("*"))
			.flatMap((el) => {
				const shadow = (el as HTMLElement).shadowRoot;
				return shadow ? this.collectImages(shadow) : [];
			});
		return [...images, ...shadowImages];
	}

	private findBackgroundColor(element: HTMLElement): string | null {
		const shadowCard = element.shadowRoot?.querySelector("[class]") as HTMLElement | null;
		const target = shadowCard || element.querySelector("[class]") as HTMLElement | null || element;
		const color = getComputedStyle(target).backgroundColor;
		return color && color !== "rgba(0, 0, 0, 0)" ? color : null;
	}
}
