# 更新记录 / Changelog

## 1.0.4 — 2026-11-20

- README 图片改为按版本固定（`@v1.0.3`），避免 CDN 继续返回旧 banner。
- 无功能变更。

## 1.0.3 — 2026-11-20

- README：移除常见问题与界面示意图；安装区补 `dsh plugin`、`npm install`、`git clone` 命令。
- banner 改为不含具体文档内容的通用示意；移除 `screenshots.json` 与预览图。
- 无功能变更。

## 1.0.2 — 2026-11-20

- 重写 README（中文 + 英文）：banner、界面示意、安装与工具速查。
- 新增 `screenshots.json` 与 `assets/`（banner、图标、界面示意）。
- `package.json` 补 `main` 字段，`files` 纳入 `assets`、`screenshots.json`、`README.en.md`。
- 无功能变更。

## 1.0.1 — 2026-11-17

- 文档补丁：修正 README 里「npm 暂未发布」的过期说明。
- 无功能变更。

## 1.0.0 — 2026-11-17

- 首个公开版本：侧栏知识库、两级主题 + 自由标签、全文检索、五个工具、同源 RPC。
- 数据落在 `~/.dsh-kb/data/kb.json`，可用 `KB_STORE_DIR` 重定向。
