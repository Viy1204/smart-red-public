# Smart RED

![Obsidian](https://img.shields.io/badge/Obsidian-7C3AED?style=flat-square) ![obsidian-version](https://img.shields.io/badge/Obsidian-%3E%3D0.15.0-7C3AED?style=flat-square) ![version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square) ![release](https://img.shields.io/github/v/release/Viy1204/smart-red-public?style=flat-square) ![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square) ![typescript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

将 Obsidian 笔记一键转换为**小红书风格图片卡片**（1080×1440px，3:4 比例）的插件。自动分页、多模板、支持图片和表格渲染、批量导出。

## 效果

左侧写笔记，右侧实时预览卡片效果——支持翻页、锁定编辑、切换模板、一键导出 PNG（单张或 ZIP 打包）。

## 功能

- **智能分页引擎** — 测量驱动的单管线分页：每一页都用真实模板 DOM 测量候选内容高度后贪心填满，段落按行二分切分，从根上消除底部留白和内容提前跳页。分页前会等待字体加载。
- **CJK 排版引擎** — 中日韩文字自动换行，Kinsoku 禁则处理（行首禁则、行尾禁则），中英文混排流畅。
- **19 套精品模板**
  - 中文长文系列
    - `Editorial` — 高级编辑部纸张质感，适合科技评论和深度长文
    - `Monochrome` — 黑白研究报告风，适合高密度信息
    - `Neo Grid` — 设计感网格和醒目标注，适合结构化观点
    - `Warm Zine` — 温暖手作 zine，适合个人写作
    - `Noir Magazine` — 深色杂志风，适合夜间和强情绪内容
    - `Ivory Essay` / `Red Ledger` / `Slate Journal` / `Pearl Magazine` / `Ink Report` — 更适合中文长文的杂志、报告和手账背景
  - 品牌系列（配色与字体参考 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)）
    - `Claude` — 暖奶油纸 + 衬线标题 + 珊瑚强调
    - `MiniMax` — 纯白近黑 + 角落多色渐变
    - `xAI` — 近黑画布 + 日落渐变 + 等宽大写页眉
    - `Lovable` — 暖羊皮纸 + 圆润字体 + 暖色渐变与圆角
    - `Notion` — 三色 pastel 标题块 + 灰底 callout + 彩色标签
    - `Figma` — 黑白编辑 + 荧光高亮标题 + 淡彩色块
    - `Apple` — 超大紧字距标题 + 大留白 + Action Blue
    - `The Verge` — 近黑 + 酸薄荷/紫外光 + 超粗大写标题
    - `Wired` — 黑白杂志 + 高瘦衬线大字报头 + 首字下沉
- **Markdown 视觉渲染** — 支持粗体、斜体、链接、行内代码、删除线、任务列表、引用、代码块、图片说明和表格样式
- **图片 & 表格支持** — Markdown 图片会先预加载并按真实宽高测量；加载失败的坏图默认跳过，避免在图片卡片里留下大块空白。
- **导出管线** — 复制当前页图片、单张 PNG（默认 2160×2880px，2x Retina）或 ZIP 批量导出，html-to-image 主渲染 + html2canvas 兜底，并拦截明显空白图
- **设置项** — 模板切换、连续分页、工具栏调字号/字体、头像昵称、页脚文案、主题颜色、导出倍率
- **实时预览** — 300ms debounce，requestAnimationFrame 渲染，编辑锁定/解锁

## 安装

### 手动安装

1. 下载 [releases](https://github.com/Viy1204/smart-red-public/releases) 中的 `main.js`、`manifest.json`、`styles.css`
2. 复制到你的 vault 的 `.obsidian/plugins/smart-red/` 目录
3. 重启 Obsidian，在设置 → 第三方插件中启用

### 从源码构建

```bash
git clone https://github.com/Viy1204/smart-red-public
cd smart-red
bun install
bun run build
```

把 `main.js`、`manifest.json`、`styles.css` 复制到 vault 的插件目录。

## 使用说明

### 1. 打开预览

1. 在 Obsidian 里打开一篇 Markdown 笔记。
2. 点击左侧 Ribbon 栏里的 Smart RED 图标，或打开命令面板搜索 `Smart RED: Open Smart RED Preview`。
3. 右侧会打开 Smart RED 预览面板，自动把当前笔记排成小红书图片卡片。

如果右侧没有内容，先确认当前打开的是 `.md` 笔记，并且笔记里有正文。

### 2. 使用顶部工具栏

顶部工具栏从左到右是：

| 按钮 | 作用 |
|------|------|
| `Lock` | 锁定当前预览。锁定后你继续编辑笔记，右侧不会自动刷新，适合对照修改。再次点击可解锁。 |
| `‹` / `›` | 上一页 / 下一页。 |
| `1/8` | 当前页码 / 总页数。 |
| 模板下拉框 | 切换卡片模板，切换后会自动保存。 |
| `A-` / `A+` | 快速缩小或放大卡片正文字号。 |
| `H-` / `H+` | 快速缩小或放大页眉、页脚、页码和继续阅读字号。 |
| 字体下拉框 | 快速切换默认字体、系统黑体、思源黑体/宋体、霞鹜文楷、HarmonyOS、阿里普惠、宋体/仿宋或等宽字体；未安装主字体时会使用 fallback。 |
| `Copy` | 复制当前页 PNG 图片到剪贴板，适合直接粘贴到聊天、飞书、微信等地方。 |
| `PNG` | 下载当前页 PNG。 |
| `ZIP` | 把所有页打包成 ZIP 下载。 |

一般工作流是：左边写笔记，右边看预览，满意后用 `Copy` 复制当前页，或用 `ZIP` 一次导出全部页面。

### 3. 推荐的笔记写法

Smart RED 会自动分页。第一条 `# H1` 会作为文章标题显示在卡片右上角；如果没有 H1，会使用当前 Markdown 文件名。

```markdown
# 这一组图片的大标题

## 第 1 页标题

这里写正文。可以使用 **粗体**、*斜体*、`行内代码`、[链接](https://example.com)。

- 要点一
- 要点二
- [ ] 待办事项

---

这里会从新的一张卡片开始。

## 第 2 个 section

> 引用会被排成杂志感 pull quote。

| 项目 | 说明 |
| ---- | ---- |
| A | 表格也会有样式 |

![图片说明](https://example.com/image.png)
```

### 4. 切图规则

Smart RED 默认会尽量填满每张图：

- `#`、`##` 等标题只是正文结构，不会自动浪费一整张图；第一条 H1 同时会进入右上角标题位。
- 如果一页内容太长，插件会基于真实渲染高度继续自动分页，并保留少量页脚安全区，避免正文被底部 chrome 裁掉。
- 单独一行 `---` 表示"从这里开始新的一张卡片"，分隔线本身不会渲染出来。
- 连续两个以上空行 = 额外留白：敲 1 个空行是正常分段，每多敲 1 个空行就在卡片上多出一个段落间距的空白（落在页首/页尾时自动忽略）。

所以通常只需要正常写文章；想手动控制换图时，写一行 `---` 即可。

### 5. 设置头像、昵称和页脚

进入 Obsidian 设置 → 第三方插件 → Smart RED，可以设置：

- `Avatar`：头像 URL 或本地资源路径。
- `Nickname`：显示在卡片页眉里的昵称。
- `Subtitle`：认证、身份、栏目名等短说明。
- `Footer`：页脚左下角文案，例如公众号名、账号名、系列名；默认是 `Smart RED`。
- `Show header` / `Show footer`：分别控制页眉和页脚的显示。
- `Round avatar`：头像是否显示为圆形。

如果不填头像昵称，模板会显示默认的杂志页眉；填了之后会显示你的创作者信息。

### 6. 调整模板和主题

插件内置 19 套模板：

- `Editorial`：默认，高级杂志纸张感，适合中文长文阅读。
- `Monochrome`：黑白研究报告风，适合严肃信息。
- `Neo Grid`：网格和强强调，适合结构化观点。
- `Warm Zine`：暖色 zine 风，适合个人表达。
- `Noir Magazine`：深色杂志风，适合强情绪内容。
- `Ivory Essay`：干净的长文随笔纸张，适合耐读型文章。
- `Red Ledger`：红色账本/手稿风，适合复盘、清单和观点文。
- `Slate Journal`：冷静期刊风，适合职场分析、组织观察。
- `Pearl Magazine`：柔和杂志风，适合更精致的女性向/生活方式内容。
- `Ink Report`：克制报告风，适合严肃长文和高密度内容。
- `Claude`：暖奶油纸、衬线标题、珊瑚强调，humanist 编辑感。
- `MiniMax`：纯白近黑、角落多色渐变，干净的 AI 基建感。
- `xAI`：近黑画布、日落/暮紫渐变、等宽大写页眉，工程冷感。
- `Lovable`：暖羊皮纸、圆润人文字体、暖色渐变与圆角，亲和手作感。
- `Notion`：三色 pastel 标题块、灰底 callout、彩色标签 pill，产品工作区感。
- `Figma`：黑白编辑、荧光高亮标题、淡彩色块，技术又活泼。
- `Apple`：超大紧字距标题、大留白、单一 Action Blue，发布会海报感。
- `The Verge`：近黑底、酸薄荷/紫外光、超粗大写标题，科技小报夜店感。
- `Wired`：黑白杂志、高瘦衬线大字报头、首字下沉，印刷杂志感。

品牌系列（`Claude`～`Wired`）的配色和字体参考 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)。其中 `Apple` / `Notion` / `Lovable` / `Wired` 用到 Inter、Hanken Grotesk、Playfair Display、Source Serif 4 几款字体，已随插件打包，离线可用。

设置页里的 `Custom Theme` 可以在当前模板基础上微调：

- `Font family`：自定义字体栈。
- `Text color`：正文和标题颜色。
- `Background color`：卡片背景色。
- `Accent color`：强调色、链接色、装饰线颜色。
- `Paragraph spacing`：段落间距。

预览顶部工具栏也提供了正文字号、页眉页脚字号和常用字体的快捷入口，适合边看边调。

建议先选模板，再只改一两个变量。改太多颜色容易破坏模板本来的质感。

### 7. 导出建议

- 想快速发给别人：用 `Copy`，直接复制当前页。
- 想保存单张图：用 `PNG`。
- 想导出整篇笔记：用 `ZIP`。
- 默认导出倍率是 `2x`，也就是 2160×2880，适合小红书发布。需要更小文件可以在设置里改成 `1x`。

### 8. 常见问题

**导出的图片是黑的或空白怎么办？**

请先确认已经重载插件，并使用最新构建。当前版本会用可渲染的 light DOM 导出，并在复制/导出后检查明显空白图，避免成功提示后粘贴出来是空白。

**Copy 没反应怎么办？**

部分系统或 Obsidian 环境可能限制图片剪贴板写入。可以改用 `PNG` 下载当前页。

**为什么链接不会显示原始 Markdown？**

插件会把 `[文字](链接)`、裸 URL、`[[wikilink|别名]]` 渲染成更适合图片的链接文本，不会直接暴露 Markdown 语法。

**图片不显示怎么办？**

优先使用可访问的网络图片或 Obsidian 能读取的本地路径。相对路径会按当前 Markdown 文件所在目录解析；如果图片加载失败，Smart RED 会跳过这张坏图，不再保留大占位。

**一页文字太多怎么办？**

插件会等待字体加载后用真实 DOM 测量分页，优先保证不截字，同时尽量填满图片空间。单独一行 `---` 强制从下一张卡片开始。

### 支持的 Markdown 语法

| 语法 | 支持 | 说明 |
|------|------|------|
| `# H1` ~ `###### H6` | ✅ | 分页时标题不跨页 |
| `**粗体**` / `*斜体*` | ✅ | |
| `- 列表` / `1. 列表` | ✅ | |
| `> 引用` | ✅ | |
| `` `代码` `` | ✅ | |
| ` ``` ` 代码块 | ✅ | 跨页时添加续接标记「⤻ 续上页」 |
| `![alt](url)` 图片 | ✅ | 成功加载后按真实宽高排版；加载失败会跳过 |
| `\| 表格 \|` | ✅ | 表格不跨页，超出记「见下页」 |
| `[[wikilink]]` | ✅ | 渲染为链接文本 |
| `---` 强制翻页 | ✅ | 不渲染横线，直接开新卡片 |
| 连续空行留白 | ✅ | 2+ 空行按数量增加段间空白 |
| `~~删除线~~` | ✅ | |
| `- [ ]` 任务列表 | ✅ | |
| Callouts / Embeds | ❌ | 自动剥离 |
| Mermaid / Math | ❌ | 自动剥离 |
| Frontmatter | ❌ | 自动剥离 |

## 模板

### Editorial
默认模板。暖纸底、serif 标题、细网格和杂志页码，适合科技评论、职场观点和深度长文。

### Monochrome
象牙纸黑白排版，强边框和研究报告气质，适合高密度、严肃、长段落内容。

### Neo Grid
蓝色网格、荧光标注、粗标题，适合金句、结构化观点和更设计感的表达。

### Warm Zine
黄纸、手作纹理、暖色强调，适合个人化写作、随笔和不想太“企业感”的内容。

### Noir Magazine
深色杂志风、粉色重点、夜间编辑部气质，适合强情绪、夜间、评论类内容。

### Ivory Essay
干净象牙纸、细边框和低调强调，适合耐读型中文长文。

### Red Ledger
淡红底和竖向账本线，适合复盘、清单、观点和系列文章。

### Slate Journal
冷静灰绿期刊风，适合职场、组织和研究类内容。

### Pearl Magazine
柔和杂志感，轻装饰、低噪音，适合更精致的叙事内容。

### Ink Report
克制黑白报告风，边框明确，适合高密度信息和严肃表达。

### Claude
暖奶油纸底、衬线标题、珊瑚强调和黑色射线点缀，humanist 编辑部气质，适合科技评论和有温度的长文。

### MiniMax
纯白画布、近黑标题、角落多色渐变球，干净利落的 AI 基建感，适合产品发布和结构化观点。

### xAI
近黑画布、底部日落/暮紫渐变、等宽大写页眉，工程冷感、未来感，适合金句和强观点短文（深色长文偏闷）。

### Lovable
暖羊皮纸、圆润人文字体、暖色渐变与圆角一切，亲和手作感，适合个人写作和产品故事。

### Notion
三色轮换 pastel 标题块、灰底 callout、彩色标签 pill，产品工作区气质，适合教程、清单和知识整理。

### Figma
黑白编辑骨架、荧光柠檬高亮标题、淡彩色块点缀，技术又活泼，适合设计观点和结构化表达。

### Apple
超大紧字距标题、大量留白、单一 Action Blue 和图片投影，发布会海报感，适合极简金句和产品叙事。

### The Verge
近黑底、酸薄荷/紫外光强调、超粗大写标题和薄荷引用块，科技小报夜店感，适合强情绪、强观点内容（中文标题不会大写）。

### Wired
黑白杂志、高瘦衬线大字报头、首字下沉和黑色粗分隔条，印刷杂志气质，适合深度报道和长文。

## 技术栈

- **语言**: TypeScript
- **构建**: esbuild
- **测试**: Bun test + happy-dom
- **渲染**: Shadow DOM 预览隔离、light DOM 离屏导出、html-to-image@1.11.11、html2canvas 1.4.1 兜底
- **导出**: JSZip 3.10.1
- **排版**: @cto.af/linebreak（CJK 断字）、Kinsoku 禁则规则（L1 严格模式）
- **分页**: 自研 Folio.js v2 overflow-fill 算法

## 开发

```bash
# 安装
bun install

# 开发模式（watch）
bun run dev

# 生产构建
bun run build    # 输出 main.js

# 测试
bun test         # 246 tests, 642 expect() calls

# 测试（watch）
bun test --watch
```

### 项目结构

```
src/
├── main.ts                    # 插件入口 + 注册
├── view.ts                    # RedView (Obsidian ItemView)
├── settings.ts                # 设置页
├── types.ts                   # 核心类型 (BlockType, SemanticBlock)
├── cjk-line-breaker.ts        # CJK 自动换行 + Kinsoku 禁则
├── clipboard.ts               # 当前页 PNG 复制到剪贴板
├── markdown-parser.ts         # Markdown → 语义块树
├── pagination-engine.ts       # overflow-fill 分页引擎
├── section-splitter.ts        # 连续分页 + 兼容旧 section 工具
├── template-renderer.ts       # Shadow DOM 模板渲染器
├── export-pipeline.ts         # PNG/ZIP 导出管线
├── templates/
│   ├── types.ts               # 模板接口
│   ├── gallery.ts             # 10 套精品模板
│   └── utils.ts               # Markdown inline 渲染与模板工具
├── spike-rendering.ts         # 渲染验证 spike
└── __tests__/                 # 24 个测试文件
```

## 设计决策

- **Shadow DOM 预览隔离** — 预览使用 Shadow DOM，模板样式不污染 Obsidian 全局样式
- **Light DOM 离屏导出** — PNG、ZIP、Copy 使用普通 DOM 导出，避免 Shadow DOM host 被截图库捕获成黑图
- **html-to-image@1.11.11 固定版本** — v1.11.13+ 存在回归 bug
- **不分页给 AI 做** — 智能分页是 core differentiator，不用 AI 不用模板
- **只输出 1080×1440** — 小红书原生比例，不做其他尺寸
- **CSS 变量做主题覆盖** — 默认模板保持精品视觉，自定义主题只覆盖关键变量，避免破坏整体版式

## License

MIT
