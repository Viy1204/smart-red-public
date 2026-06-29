# Smart RED

![Obsidian](https://img.shields.io/badge/Obsidian-7C3AED?style=flat-square) ![obsidian-version](https://img.shields.io/badge/Obsidian-%3E%3D0.15.0-7C3AED?style=flat-square) ![version](https://img.shields.io/badge/version-0.1.5-blue?style=flat-square) ![release](https://img.shields.io/github/v/release/Viy1204/smart-red-public?style=flat-square) ![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square) ![typescript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

**Smart RED** is an Obsidian plugin that turns your Markdown notes into **Xiaohongshu (RED) style image cards** at 1080×1440px (3:4 ratio). It packs a measurement driven pagination engine, 19 card templates, image and table rendering, and one click PNG or ZIP export.

> 中文说明见 [README.zh.md](./README.zh.md)。

## Demo

Write on the left, preview cards on the right. Flip pages, lock the preview, switch templates, and export PNG or ZIP with one click.

## Features

- **Smart pagination engine** — Greedy overflow-fill pagination driven by real template DOM measurements. Paragraphs are split line by line to eliminate bottom whitespace and premature page breaks. Waits for fonts to load before measuring.
- **CJK typography engine** — Automatic line breaking for Chinese, Japanese and Korean text with Kinsoku shori rules (prohibited line starts/ends) and smooth mixed CJK/Latin layout.
- **19 polished templates**
  - Chinese long-form series
    - `Editorial` — premium editorial paper texture for tech commentary and deep long reads
    - `Monochrome` — black-and-white research report style for dense information
    - `Neo Grid` — design grid with bold highlights for structured opinions
    - `Warm Zine` — warm handmade zine for personal writing
    - `Noir Magazine` — dark magazine style for night and emotionally strong content
    - `Ivory Essay` / `Red Ledger` / `Slate Journal` / `Pearl Magazine` / `Ink Report` — magazine, report and journal backgrounds tuned for Chinese long reads
  - Brand series (colors and fonts inspired by [awesome-design-md](https://github.com/VoltAgent/awesome-design-md))
    - `Claude` — warm cream paper + serif headings + coral accent
    - `MiniMax` — pure white near-black + corner multi-color gradients
    - `xAI` — near-black canvas + sunset gradient + monospaced all-caps header
    - `Lovable` — warm parchment + rounded humanist fonts + warm gradients and rounded corners
    - `Notion` — tri-color pastel title blocks + gray callouts + colorful tags
    - `Figma` — black-and-white editor + neon highlight headings + soft color blocks
    - `Apple` — oversized tight-tracking heading + generous whitespace + Action Blue
    - `The Verge` — near-black + acid mint/ultra-violet + extra bold all-caps heading
    - `Wired` — black-and-white magazine + tall serif masthead + drop cap
- **Markdown visual rendering** — bold, italic, links, inline code, strikethrough, task lists, blockquotes, code blocks, image captions and table styles
- **Image and table support** — Markdown images are preloaded and measured by real dimensions; broken images are skipped by default to avoid large empty placeholders
- **Export pipeline** — copy current page, single PNG (default 2160×2880px, 2x Retina) or ZIP batch export. Uses html-to-image as primary renderer with html2canvas fallback, and blocks obviously blank images
- **Settings** — template switching, heading split level, font size, chrome font size, avatar/nickname/footer, theme colors, export scale
- **Live preview** — 300ms debounce, requestAnimationFrame rendering, edit lock/unlock

## Installation

### Manual install

1. Download `main.js`, `manifest.json` and `styles.css` from [Releases](https://github.com/Viy1204/smart-red-public/releases)
2. Copy them into your vault's `.obsidian/plugins/smart-red/` folder
3. Restart Obsidian and enable the plugin under Settings → Community plugins

### Build from source

```bash
git clone https://github.com/Viy1204/smart-red-public
cd smart-red-public
bun install
bun run build
```

Then copy `main.js`, `manifest.json` and `styles.css` to the plugin folder.

## Usage

### 1. Open the preview

1. Open a Markdown note in Obsidian.
2. Click the Smart RED ribbon icon, or open the command palette and run `Smart RED: Open preview`.
3. The right panel renders the note as RED-style image cards.

If the panel is empty, make sure a `.md` note is active and contains body text.

### 2. Toolbar

From left to right:

| Button | Action |
|--------|--------|
| `Lock` | Lock the preview so editing no longer refreshes it. Click again to unlock. |
| `‹` / `›` | Previous / next page. |
| `1/8` | Current page / total pages. |
| Template dropdown | Switch card template. Auto-saved. |
| `A-` / `A+` | Decrease / increase body font size. |
| `H-` / `H+` | Decrease / increase chrome font size (header, footer, page number). |
| Font dropdown | Quick switch between default, system sans, Source Han, LXGW WenKai, HarmonyOS, Alibaba PuHuiTi, serif/fangsong or monospace fonts. |
| `Copy` | Copy current page PNG to clipboard. |
| `PNG` | Download current page PNG. |
| `ZIP` | Download all pages as a ZIP. |

Typical workflow: write on the left, preview on the right, then `Copy` the current page or `ZIP` the whole note.

### 3. Recommended note format

Smart RED paginates automatically. The first `# H1` becomes the article title in the top-right chrome; if there is no H1, the Markdown file name is used.

```markdown
# Main title for this set of cards

## Page 1 title

Body text with **bold**, *italic*, `inline code`, and [links](https://example.com).

- Bullet one
- Bullet two
- [ ] A task item

---

This starts a new card.

## Second section

> Blockquotes are rendered as magazine pull quotes.

| Item | Description |
|------|-------------|
| A    | Tables get styled too |

![Image caption](https://example.com/image.png)
```

### 4. Pagination rules

Smart RED tries to fill every card:

- Headings (`#`, `##`, ...) are structural; only the first H1 also fills the top-right title slot.
- If a page is too long, the plugin paginates based on real rendered height and keeps a small footer safe zone.
- A single line `---` forces a new card. The horizontal rule itself is not rendered.
- Two or more consecutive blank lines add extra vertical space: one blank line is a normal paragraph break, each extra blank line adds one paragraph gap (ignored at page top/bottom).

### 5. Profile and footer

In Obsidian Settings → Community plugins → Smart RED, configure:

- `Avatar` — URL or vault path to an avatar image.
- `Nickname` — creator name shown in the card header.
- `Subtitle` — certification, role or short description.
- `Footer` — bottom-left text such as a public account or series name. Defaults to `Smart RED`.
- `Show header` / `Show footer` — toggle chrome visibility.
- `Round avatar` — circular crop.

If no avatar or nickname is set, templates fall back to a default magazine header.

### 6. Templates and themes

Built-in 19 templates cover editorial, magazine, zine and brand styles. See the [Templates](#templates) section below for a quick guide.

The `Custom Theme` section in settings lets you override:

- `Font family` — custom CSS font stack.
- `Text color` — body and heading color.
- `Background color` — card background color.
- `Accent color` — link, rule and emphasis color.
- `Paragraph spacing` — paragraph gap in px.

The toolbar also provides shortcuts for body font size, chrome font size and common fonts. Start from a template, then tweak one or two variables. Changing too many colors can break the template's original feel.

### 7. Export tips

- `Copy` — fastest way to share the current page.
- `PNG` — save the current page.
- `ZIP` — export the whole note.
- Default export scale is `2x` (2160×2880), good for RED posting. Change to `1x` in settings for smaller files.

### 8. FAQ

**Exported image is black or blank?**

Reload the plugin and use the latest build. Current versions render with a real light DOM for export and reject obviously blank images.

**Copy does nothing?**

Some systems or Obsidian environments restrict clipboard image writes. Use `PNG` instead.

**Why don't links show raw Markdown?**

`[text](link)`, bare URLs and `[[wikilink|alias]]` are rendered as readable link text, not raw Markdown.

**Image not showing?**

Use reachable network images or local paths Obsidian can read. Relative paths are resolved from the current Markdown file. Broken images are skipped.

**Too much text on one page?**

The plugin waits for fonts and measures real DOM height, prioritizing no clipped text while filling the card. Use `---` to force a new card.

### Supported Markdown syntax

| Syntax | Supported | Notes |
|--------|-----------|-------|
| `# H1` ~ `###### H6` | ✅ | Headings do not split across pages |
| `**bold**` / `*italic*` | ✅ | |
| `- list` / `1. list` | ✅ | |
| `> quote` | ✅ | |
| `` `code` `` | ✅ | |
| ` ``` ` code block | ✅ | Continuation marker `⤻` added when split |
| `![alt](url)` image | ✅ | Layout uses real dimensions; broken images skipped |
| `\| table \|` | ✅ | Tables do not split; overflow noted as "continued" |
| `[[wikilink]]` | ✅ | Rendered as link text |
| `---` page break | ✅ | Not rendered as a line |
| Consecutive blank lines | ✅ | 2+ blank lines add extra spacing |
| `~~strikethrough~~` | ✅ | |
| `- [ ]` task list | ✅ | |
| Callouts / Embeds | ❌ | Stripped |
| Mermaid / Math | ❌ | Stripped |
| Frontmatter | ❌ | Stripped |

## Templates

### Editorial
Default template. Warm paper, serif headings, fine grid and magazine page numbers. Good for tech commentary, workplace observations and deep long reads.

### Monochrome
Ivory paper black-and-white layout with strong borders and research-report feel. Good for dense, serious, long-paragraph content.

### Neo Grid
Blue grid, neon highlights, bold headings. Good for punchy statements, structured opinions and more designed expressions.

### Warm Zine
Yellow paper, craft texture, warm accents. Good for personal writing, essays and content that should not feel corporate.

### Noir Magazine
Dark magazine style with pink highlights and night-editorial mood. Good for strong emotions, night reading and commentary.

### Ivory Essay
Clean ivory paper, thin borders and understated emphasis. Good for readable Chinese long reads.

### Red Ledger
Light red background with vertical ledger lines. Good for reviews, checklists, opinions and series.

### Slate Journal
Calm gray-green journal style. Good for workplace, organization and research content.

### Pearl Magazine
Soft magazine feel, light decoration, low noise. Good for more refined narrative content.

### Ink Report
Restrained black-and-white report style with clear borders. Good for dense information and serious expression.

### Claude
Warm cream paper, serif headings, coral accent and black ray dots. Humanist editorial feel for tech commentary and warm long reads.

### MiniMax
Pure white canvas, near-black headings, corner multi-color gradient spheres. Clean AI infrastructure feel for product launches and structured opinions.

### xAI
Near-black canvas, bottom sunset/twilight gradient, monospaced all-caps header. Engineering-cool and futuristic. Good for punchy short takes (long dark reads can feel heavy).

### Lovable
Warm parchment, rounded humanist fonts, warm gradients and rounded corners everywhere. Friendly handmade feel for personal writing and product stories.

### Notion
Tri-color rotating pastel title blocks, gray callouts, colorful tag pills. Product workspace feel for tutorials, checklists and knowledge organization.

### Figma
Black-and-white editor skeleton, neon lemon highlight headings, soft color blocks. Technical yet playful. Good for design opinions and structured expression.

### Apple
Oversized tight-tracking heading, generous whitespace, single Action Blue and image shadows. Launch poster feel for minimalist statements and product narratives.

### The Verge
Near-black background, acid mint/ultra-violet accents, extra bold all-caps heading and mint quote blocks. Tech tabloid nightclub feel for strong-opinion content (Chinese headings are not uppercased).

### Wired
Black-and-white magazine, tall serif masthead, drop cap and black thick divider bars. Print magazine feel for in-depth reports and long reads.

## Tech stack

- **Language**: TypeScript
- **Build**: esbuild
- **Tests**: Bun test + happy-dom
- **Rendering**: Shadow DOM preview isolation, light DOM off-screen export, html-to-image@1.11.11, html2canvas@1.4.1 fallback
- **Export**: fflate
- **Typography**: @cto.af/linebreak (CJK line breaking), Kinsoku rules (strict L1 mode)
- **Pagination**: custom Folio.js v2 overflow-fill algorithm

## Development

```bash
# Install
bun install

# Dev mode (watch)
bun run dev

# Production build
bun run build    # outputs main.js

# Test
bun test

# Test (watch)
bun test --watch
```

### Project structure

```
src/
├── main.ts                    # plugin entry + registration
├── view.ts                    # RedView (Obsidian ItemView)
├── settings.ts                # settings tab
├── types.ts                   # core types (BlockType, SemanticBlock)
├── cjk-line-breaker.ts        # CJK line breaking + Kinsoku rules
├── clipboard.ts               # copy current page PNG to clipboard
├── markdown-parser.ts         # Markdown → semantic block tree
├── pagination-engine.ts       # overflow-fill pagination engine
├── section-splitter.ts        # continuous pagination + legacy section tool compat
├── template-renderer.ts       # Shadow DOM template renderer
├── export-pipeline.ts         # PNG/ZIP export pipeline
├── templates/
│   ├── types.ts               # template interfaces
│   ├── gallery.ts             # 19 templates
│   └── utils.ts               # Markdown inline rendering and template utilities
└── __tests__/                 # test files
```

## Design decisions

- **Shadow DOM preview isolation** — preview uses Shadow DOM so template styles do not pollute Obsidian global styles.
- **Light DOM off-screen export** — PNG, ZIP and Copy use plain DOM export to avoid Shadow DOM hosts being captured as black boxes by screenshot libraries.
- **html-to-image@1.11.11 pinned** — v1.11.13+ has a regression bug.
- **No AI for pagination** — smart pagination is the core differentiator.
- **Fixed 1080×1440 output** — native RED ratio.
- **CSS variable theme overrides** — default templates stay polished; custom themes only override key variables.

## License

MIT
