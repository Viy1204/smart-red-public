# Changelog

## 0.3.1 — 2026-10-21

### 修复 / Fixed

- 移除卸载插件时主动关闭预览面板的逻辑，由 Obsidian 管理视图生命周期，保留用户设置的面板位置。修复 0.3.0 社区目录审核的阻断项。 / Removed preview-leaf detachment during plugin unload so Obsidian can preserve the user's panel layout; addresses the blocking community-directory finding in 0.3.0.

## 0.3.0 — 2026-10-21

### 新增 / Added

- 新增清爽编辑版、数据简报、手写信笺、档案夹，模板总数由 21 增至 25。 / Four new templates: Fresh Editorial, Data Brief, Letter, and Dossier; 25 templates in total.
- 新增配色面板，支持深浅分组、方案预览、模板默认色与明暗不匹配提示。切换模板时自动重置不匹配的方案。 / A palette picker with light/dark groups, color previews, defaults, and tone-mismatch handling when switching templates.
- 新增左右边距控制，封面标题随可用宽度重新换行。 / Adjustable side padding, including cover-title reflow.
- 新增「避免孤行」，默认开启，减少段落末行单独落到下一张卡片的情况。可关闭以优先填满页面。 / An optional paragraph widow guard, enabled by default; turn it off to favor page density.
- 清爽编辑版新增舒适（40 像素）和紧凑（36 像素）档位，独立保存正文、标题字体与阅读设置。 / Comfortable (40 px) and Compact (36 px) reading presets with separate body/heading fonts for Fresh Editorial.

### 调整 / Changed

- 模板名称、工具栏和设置页改为中文；新安装默认选择清爽编辑版并启用封面。 / Chinese template names and controls; new installations default to Fresh Editorial with a cover.
- 正式发布继续使用 `smart-red` 插件 ID 及原有预览命令、视图 ID，保留已有正式版设置。独立测试版的设置不会自动导入。 / Production keeps the existing plugin, command, and view IDs and preserves production settings; separate test-plugin settings are not imported.
- 更新中英文 README、市场更新说明和本变更记录。 / Updated English and Chinese documentation and release instructions.

### 修复 / Fixed

- 修复排版测试版开启避免孤行后，包含多次单换行的超高段落可能拒绝拆分并裁切尾部的问题。 / Fixed clipping when the design test build's widow guard refused to split an oversized paragraph containing soft line breaks.
- 清爽编辑版字号滑块下限与实际支持范围统一为 28 像素。 / Matched the Fresh Editorial font-size slider minimum to its supported 28 px limit.

### 已知问题 / Known issues

- [Issue 11](https://github.com/Viy1204/smart-red-public/issues/11)：0.1.7 的 Copy／PNG 失败反馈仍在定位，原因尚未确认，本版本不将其列为已修复。 / The reported environment-specific Copy/PNG failure remains under investigation; this release does not claim to fix it.
- 不同设备的中文字体可能改变换行和页数；过长的不可拆分内容仍受固定卡片高度限制。 / CJK font availability can change pagination; oversized indivisible blocks remain constrained by card height.

## 0.1.7 — 2026-10-20

- 支持 Obsidian `==高亮==`、独立高亮背景色与加粗颜色叠加，并完善跨页嵌套标记保留。 / Added Obsidian highlights, configurable highlight backgrounds, and improved inline formatting across page splits.
- [对应改动 / Pull request](https://github.com/Viy1204/smart-red-public/pull/10)

## 0.1.6 — 2026-10-20

- 更新复制与 PNG 导出的 light DOM 渲染、兜底和空白图检查。 / Updated Copy/PNG light-DOM rendering, fallback, and blank-image checks.
- [对应改动 / Pull request](https://github.com/Viy1204/smart-red-public/pull/9)

## 0.1.0—0.1.5

早期版本记录以 [GitHub Releases](https://github.com/Viy1204/smart-red-public/releases) 为准。 / See GitHub Releases for earlier version history.
