/**
 * Smart-Red: Rendering Validation Spike
 * 
 * Minimal Obsidian ItemView that validates html-to-image can correctly
 * render Chinese + English mixed content as PNG in Obsidian's Electron environment.
 * 
 * This is a SPIKE - not production code. It validates:
 * 1. html-to-image works in Obsidian Electron
 * 2. Chinese characters render correctly (not squares)
 * 3. CSS variable performance (Chrome 138+ bug)
 * 4. Font loading (document.fonts.ready + double-invocation)
 * 5. html2canvas fallback works
 */

import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import { toBlob, toPng, toCanvas } from 'html-to-image';
import html2canvas from 'html2canvas';

export const VIEW_TYPE_SPIKE = 'smart-red-spike';

// CSS variable filter for Chrome 138+ performance bug
function styleFilter(node: HTMLElement): boolean {
	// Exclude CSS custom properties (--*) to avoid Chrome 138+ performance regression
	// This filter is passed to html-to-image's includeStyleProperties
	return true; // We use a different approach - filter in the config
}

function includeStyleProperties(prop: string): boolean {
	// Filter out CSS custom properties to avoid Chrome 138+ 5-10x slowdown
	return !prop.startsWith('--');
}

export class SpikeView extends ItemView {
	private containerEl_: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_SPIKE;
	}

	getDisplayText(): string {
		return 'Smart-Red Spike';
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass('smart-red-spike-container');

		// Create a 1080x1440 card container
		const card = container.createEl('div', {
			cls: 'spike-card',
			attr: {
				style: `
					width: 1080px;
					height: 1440px;
					padding: 80px;
					background: #FFF8F0;
					font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
					font-size: 18px;
					line-height: 1.8;
					color: #333;
					box-sizing: border-box;
					overflow: hidden;
				`
			}
		});

		// Test content: Chinese + English mixed
		card.createEl('h2', {
			text: '渲染验证 Spike',
			attr: { style: 'font-size: 28px; margin-bottom: 24px; color: #FF6B35;' }
		});

		card.createEl('p', {
			text: '这是中文测试 English mixed 内容。如果你能看到这段文字，说明 html-to-image 在 Obsidian Electron 中工作正常。',
			attr: { style: 'margin-bottom: 16px;' }
		});

		card.createEl('p', {
			text: 'Kinsoku 测试：行首不应该出现句号。、！？）」等标点符号。',
			attr: { style: 'margin-bottom: 16px;' }
		});

		card.createEl('p', {
			text: 'The quick brown fox jumps over the lazy dog. 0123456789',
			attr: { style: 'margin-bottom: 16px; font-family: monospace;' }
		});

		// CSS variables for performance testing
		card.setAttribute('style', card.getAttribute('style') + `
			--card-bg: #FFF8F0;
			--text-color: #333;
			--accent: #FF6B35;
		`);

		// Buttons
		const buttonContainer = container.createEl('div', {
			cls: 'spike-buttons',
			attr: { style: 'margin-top: 20px; display: flex; gap: 12px;' }
		});

		buttonContainer.createEl('button', {
			text: 'Export with html-to-image',
			cls: 'mod-cta',
			attr: { style: 'padding: 8px 16px;' }
		}).addEventListener('click', async () => {
			await this.exportWithHtmlToImage(card);
		});

		buttonContainer.createEl('button', {
			text: 'Export with html2canvas (fallback)',
			cls: 'mod-cta',
			attr: { style: 'padding: 8px 16px;' }
		}).addEventListener('click', async () => {
			await this.exportWithHtml2Canvas(card);
		});

		buttonContainer.createEl('button', {
			text: 'Test CSS Variable Performance',
			cls: 'mod-cta',
			attr: { style: 'padding: 8px 16px;' }
		}).addEventListener('click', async () => {
			await this.testCssVariablePerformance(card);
		});

		this.containerEl_ = card;
	}

	async onClose() {
		// Cleanup
	}

	private async exportWithHtmlToImage(element: HTMLElement): Promise<void> {
		try {
			// Wait for fonts to load
			await document.fonts.ready;
			
			const startTime = performance.now();
			
			// Double-invocation pattern for font embedding
			// First call embeds fonts, second call captures with fonts available
			try {
				await toPng(element, {
					quality: 1,
					pixelRatio: 2,
					skipFonts: false,
					cacheBust: true,
					includeStyleProperties: includeStyleProperties,
					imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
				});
			} catch {
				// First invocation may fail for font embedding, that's expected
			}

			// Second invocation - this should produce the correct result
			const blob = await toBlob(element, {
				quality: 1,
				pixelRatio: 2,
				skipFonts: false,
				cacheBust: true,
				includeStyleProperties: includeStyleProperties,
				imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
			});

			const endTime = performance.now();
			const renderTime = (endTime - startTime).toFixed(0);

			if (blob) {
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `smart-red-spike-html2image_${Date.now()}.png`;
				link.click();
				URL.revokeObjectURL(url);
				console.log(`[Smart-Red Spike] html-to-image export successful in ${renderTime}ms, size: ${(blob.size / 1024).toFixed(1)}KB`);
			} else {
				console.error('[Smart-Red Spike] html-to-image returned null blob, falling back to html2canvas');
				await this.exportWithHtml2Canvas(element);
			}
		} catch (error) {
			console.error('[Smart-Red Spike] html-to-image failed:', error);
			await this.exportWithHtml2Canvas(element);
		}
	}

	private async exportWithHtml2Canvas(element: HTMLElement): Promise<void> {
		try {
			await document.fonts.ready;
			
			const startTime = performance.now();
			const canvas = await html2canvas(element, {
				scale: 2,
				useCORS: true,
				allowTaint: false,
				backgroundColor: '#FFF8F0',
			});
			const endTime = performance.now();
			const renderTime = (endTime - startTime).toFixed(0);

			canvas.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `smart-red-spike-html2canvas_${Date.now()}.png`;
					link.click();
					URL.revokeObjectURL(url);
					console.log(`[Smart-Red Spike] html2canvas export successful in ${renderTime}ms, size: ${(blob.size / 1024).toFixed(1)}KB`);
				}
			}, 'image/png', 1);
		} catch (error) {
			console.error('[Smart-Red Spike] html2canvas also failed:', error);
		}
	}

	private async testCssVariablePerformance(element: HTMLElement): Promise<void> {
		await document.fonts.ready;

		// Test WITHOUT CSS variable filter
		const startWithout = performance.now();
		try {
			await toPng(element, {
				quality: 1,
				pixelRatio: 2,
				skipFonts: false,
				cacheBust: true,
				// No includeStyleProperties filter
			});
		} catch { /* expected */ }
		const endWithout = performance.now();
		const timeWithout = endWithout - startWithout;

		// Test WITH CSS variable filter
		const startWith = performance.now();
		try {
			await toPng(element, {
				quality: 1,
				pixelRatio: 2,
				skipFonts: false,
				cacheBust: true,
				includeStyleProperties: includeStyleProperties,
			});
		} catch { /* expected */ }
		const endWith = performance.now();
		const timeWith = endWith - startWith;

		const improvement = timeWithout > 0 ? ((timeWithout - timeWith) / timeWithout * 100).toFixed(1) : 'N/A';

		console.log(`[Smart-Red Spike] CSS Variable Performance Test:`);
		console.log(`  Without filter: ${timeWithout.toFixed(0)}ms`);
		console.log(`  With filter: ${timeWith.toFixed(0)}ms`);
		console.log(`  Improvement: ${improvement}%`);
		console.log(`  Chrome 138+ bug present: ${timeWithout > 5000 ? 'YES (>' + (timeWithout/1000).toFixed(1) + 's)' : 'NO'}`);
	}
}

export class SpikePlugin extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_SPIKE, (leaf) => new SpikeView(leaf));

		this.addCommand({
			id: 'open-spike-preview',
			name: 'Open Smart-Red Spike Preview',
			callback: () => this.activateView(),
		});

		this.addRibbonIcon('image', 'Smart-Red Spike', () => {
			this.activateView();
		});
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_SPIKE)[0];
		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: VIEW_TYPE_SPIKE, active: true });
				leaf = rightLeaf;
			}
		}
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}