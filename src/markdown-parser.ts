import { BlockType, SemanticBlock } from './types';

export interface MarkdownRendererAPI {
  render(
    markdown: string,
    el: HTMLElement,
    sourcePath: string,
    component: unknown
  ): Promise<void>;
}

export class MarkdownParser {
  private renderer: MarkdownRendererAPI | null;

  constructor(renderer?: MarkdownRendererAPI) {
    this.renderer = renderer ?? null;
  }

  parse(markdown: string): SemanticBlock[] {
    const preprocessed = this.preprocess(markdown);
    return this.parseBlocks(preprocessed);
  }

  async renderToHTML(block: SemanticBlock): Promise<string | null> {
    if (!this.renderer) return null;
    const div = document.createElement('div');
    await this.renderer.render(block.content, div, '', null);
    return div.innerHTML;
  }

  private preprocess(markdown: string): string {
    let text = markdown;
    text = this.stripFrontmatter(text);
    text = this.stripCallouts(text);
    text = this.convertImageEmbeds(text);
    text = this.stripEmbeds(text);
    text = this.stripMermaid(text);
    text = this.stripMath(text);
    return text;
  }

  private stripFrontmatter(text: string): string {
    return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  }

  private stripCallouts(text: string): string {
    return text.replace(/^(> \[!\w+\][^\n]*\n(?:>.*\n?)*)+/gm, '');
  }

  // `![[photo.png]]` / `![[photo.png|alt]]` become standard image syntax so
  // they survive stripEmbeds, which only drops non-renderable embeds.
  private convertImageEmbeds(text: string): string {
    return text.replace(
      /!\[\[([^\]|]+\.(?:png|jpe?g|gif|webp|svg|bmp|avif))(?:\|([^\]]*))?\]\]/gi,
      (_m, file: string, alt: string | undefined) => `![${alt ?? ''}](${file.trim()})`
    );
  }

  private stripEmbeds(text: string): string {
    // Remove whole-line embeds with their newline so they leave no phantom
    // blank line behind (which would read as an intentional spacer).
    return text
      .replace(/^[ \t]*!\[\[[^\]]+\]\][ \t]*(?:\r?\n(?:[ \t]*\r?\n)?)?/gm, '')
      .replace(/!\[\[[^\]]+\]\]/g, '');
  }

  private stripMermaid(text: string): string {
    return text.replace(/```mermaid\n[\s\S]*?```\n?/g, '');
  }

  private stripMath(text: string): string {
    return text.replace(/\$\$[\s\S]*?\$\$/g, '');
  }

  private parseBlocks(text: string): SemanticBlock[] {
    const blocks: SemanticBlock[] = [];
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === '') {
        let blankCount = 0;
        while (i < lines.length && lines[i].trim() === '') {
          blankCount++;
          i++;
        }
        // One blank line is a normal paragraph break; each extra one adds a
        // visible gap (2 blanks = 1 extra gap, 3 blanks = 2, ...).
        if (blankCount >= 2 && blocks.length > 0 && i < lines.length) {
          blocks.push({
            type: BlockType.Spacer,
            content: '',
            metadata: { gaps: blankCount - 1 },
          });
        }
        continue;
      }

      if (/^[-*_]{3,}\s*$/.test(line.trim())) {
        blocks.push({ type: BlockType.HorizontalRule, content: '' });
        i++;
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        blocks.push({
          type: BlockType.Heading,
          content: headingMatch[2].trim(),
          metadata: { level: headingMatch[1].length },
        });
        i++;
        continue;
      }

      if (line.trimStart().startsWith('```')) {
        const lang = line.trimStart().slice(3).trim();
        const { content: codeContent, endLine } = this.collectCodeBlock(lines, i);
        blocks.push({
          type: BlockType.CodeBlock,
          content: codeContent,
          metadata: { language: lang || 'text' },
        });
        i = endLine + 1;
        continue;
      }

      if (line.trimStart().startsWith('|')) {
        const { content: tableContent, endLine } = this.collectTable(lines, i);
        blocks.push({
          type: BlockType.Table,
          content: tableContent,
        });
        i = endLine + 1;
        continue;
      }

      if (line.trimStart().startsWith('>')) {
        const { content: quoteContent, endLine } = this.collectBlockquote(lines, i);
        blocks.push({
          type: BlockType.Blockquote,
          content: quoteContent,
        });
        i = endLine + 1;
        continue;
      }

      if (/^[\s]*[-*+]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
        const { content: listContent, endLine } = this.collectList(lines, i);
        blocks.push({
          type: BlockType.List,
          content: listContent,
        });
        i = endLine + 1;
        continue;
      }

      if (/^!\[.*\]\(.*\)\s*$/.test(line.trim())) {
        const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgMatch) {
          blocks.push({
            type: BlockType.Image,
            content: imgMatch[2],
            metadata: { alt: imgMatch[1] },
          });
          i++;
          continue;
        }
      }

      const { content: paraContent, endLine } = this.collectParagraph(lines, i);
      if (paraContent.trim()) {
        blocks.push({
          type: BlockType.Paragraph,
          content: this.normalizeParagraphSoftBreaks(paraContent),
        });
      }
      i = endLine + 1;
    }

    return blocks;
  }

  private collectCodeBlock(lines: string[], start: number): { content: string; endLine: number } {
    const content: string[] = [];
    let i = start + 1;
    while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
      content.push(lines[i]);
      i++;
    }
    return { content: content.join('\n'), endLine: i };
  }

  private collectTable(lines: string[], start: number): { content: string; endLine: number } {
    const content: string[] = [];
    let i = start;
    while (i < lines.length && lines[i].trimStart().startsWith('|')) {
      content.push(lines[i]);
      i++;
    }
    return { content: content.join('\n'), endLine: i - 1 };
  }

  private collectBlockquote(lines: string[], start: number): { content: string; endLine: number } {
    const content: string[] = [];
    let i = start;
    while (i < lines.length && lines[i].trimStart().startsWith('>')) {
      content.push(lines[i].replace(/^>\s?/, ''));
      i++;
    }
    return { content: content.join('\n'), endLine: i - 1 };
  }

  private collectList(lines: string[], start: number): { content: string; endLine: number } {
    const content: string[] = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '') { i++; continue; }
      if (/^[\s]*[-*+]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
        content.push(line);
        i++;
      } else if (line.startsWith('  ') || line.startsWith('\t')) {
        content.push(line);
        i++;
      } else {
        break;
      }
    }
    return { content: content.join('\n'), endLine: i - 1 };
  }

  private collectParagraph(lines: string[], start: number): { content: string; endLine: number } {
    const content: string[] = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '') break;
      if (line.trimStart().startsWith('#')) break;
      if (line.trimStart().startsWith('```')) break;
      if (line.trimStart().startsWith('|')) break;
      if (line.trimStart().startsWith('>')) break;
      if (/^[\s]*[-*+]\s/.test(line)) break;
      if (/^[\s]*\d+\.\s/.test(line)) break;
      if (/^[-*_]{3,}\s*$/.test(line.trim())) break;
      if (/^!\[.*\]\(.*\)\s*$/.test(line.trim())) break;
      content.push(line);
      i++;
    }
    return { content: content.join('\n'), endLine: Math.max(start, i - 1) };
  }

  private normalizeParagraphSoftBreaks(content: string): string {
    const lines = content.split('\n');
    let result = '';

    for (const rawLine of lines) {
      const hardBreak = /(?: {2,}|\\)\s*$/.test(rawLine);
      const line = rawLine.replace(/(?: {2,}|\\)\s*$/, '').trim();
      if (!line) continue;

      if (!result) {
        result = line;
      } else {
        result += this.getSoftBreakJoiner(result, line) + line;
      }

      if (hardBreak) {
        result += '\n';
      }
    }

    return result.trim();
  }

  private getSoftBreakJoiner(previous: string, next: string): string {
    if (!previous || !next || previous.endsWith('\n')) return '';

    const prevChar = Array.from(previous).pop() ?? '';
    const nextChar = Array.from(next)[0] ?? '';
    if (!prevChar || !nextChar) return '';

    if (this.isNoSpaceBefore(nextChar) || this.isNoSpaceAfter(prevChar)) {
      return '';
    }

    if (this.isCjkLike(prevChar) && this.isCjkLike(nextChar)) {
      return '';
    }

    return ' ';
  }

  private isNoSpaceBefore(char: string): boolean {
    return '，。！？；：、,.!?;:)]}）】》〉」』”’'.includes(char);
  }

  private isNoSpaceAfter(char: string): boolean {
    return '([{（【《〈「『“‘'.includes(char);
  }

  private isCjkLike(char: string): boolean {
    const cp = char.codePointAt(0) ?? 0;
    return (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x20000 && cp <= 0x2a6df) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0x3000 && cp <= 0x303f) ||
      (cp >= 0xff00 && cp <= 0xffef) ||
      (cp >= 0x3040 && cp <= 0x30ff) ||
      (cp >= 0xac00 && cp <= 0xd7af)
    );
  }
}
