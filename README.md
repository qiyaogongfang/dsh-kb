<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/qiyaogongfang/dsh-kb@main/assets/banner.png" alt="dsh-kb — DeepSeek Harness 的本机知识库" width="100%">
</p>

<h1 align="center">dsh-kb</h1>

<p align="center"><strong>把操作流程、规范、踩坑记录收进 DSH 侧栏；对话里按需检索，不往上下文里灌正文。</strong><br>
两级主题 · 自由标签 · 全文检索 · 一个 <code>kb.json</code> 就是全部数据</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@qiyaogongfang/dsh-kb"><img src="https://img.shields.io/npm/v/@qiyaogongfang/dsh-kb?style=for-the-badge&color=3E7C8C&logo=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@qiyaogongfang/dsh-kb"><img src="https://img.shields.io/npm/dm/@qiyaogongfang/dsh-kb?style=for-the-badge&color=D9B24C" alt="月下载量" /></a>
  <img src="https://img.shields.io/badge/DSH-%E2%89%A5%200.2.2--rc.1-1B2A3C?style=for-the-badge" alt="DSH >= 0.2.2-rc.1" />
  <img src="https://img.shields.io/badge/%E4%BE%9D%E8%B5%96-0-3E7C8C?style=for-the-badge" alt="零运行时依赖" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/qiyaogongfang/dsh-kb?style=for-the-badge&color=5FA8B2" alt="MIT License" /></a>
</p>

<p align="center"><a href="README.en.md">English</a> · <a href="https://github.com/qiyaogongfang/dsh-kb">⭐ Star</a></p>

![知识库界面示意](https://cdn.jsdelivr.net/gh/qiyaogongfang/dsh-kb@main/assets/preview.png)

<sub>界面示意，非实际截图；实际外观跟随 DSH 主题。</sub>

### 为什么用它？

| 只带索引 | 两级主题 + 标签 | 一个 JSON |
| :-- | :-- | :-- |
| 系统提示里只有分类计数和每个主题前几条标题，正文只在你要时取 | 一级主题 / 二级主题成树，标签横向串联；多个标签同时命中 | `kb.json` 纯 JSON，可直接备份、同步、手改 |

- **只存不灌。** 系统提示默认只带索引（32 篇约 1100 字）；你点名要哪篇，我再 `kb_get` 取正文。
- **收得下，也找得到。** 标题、主题、标签、摘要、正文都能搜，按命中位置加权；分类计数一眼看到库存。
- **数据在你手里。** 写入是「临时文件 + 原子替换」，别的进程改过会按 mtime 重载；一个文件就是全部。
- **零运行时依赖。** 不引第三方包，装完就能用；数据不进 Git，也不上传。
- **两边都能改。** 侧栏里手动编辑，或者直接让 agent 用 `kb_save` / `kb_update` 写。

### 30 秒上手

1. 在 DSH 的「插件」里搜索 **`dsh-kb`** 并安装（认准 `@qiyaogongfang/dsh-kb`）。
2. 刷新页面，左侧栏出现「知识库」。
3. 新建一篇，或直接在对话里说「把这条记进知识库」。

命令行安装：

```bash
dsh plugin --profile web add @qiyaogongfang/dsh-kb
```

> npm 上还有一个叫 `dsh-kb` 的包是别人做的，不是这个项目；认准作用域 `@qiyaogongfang/`。

### 五个工具

| 工具 | 作用 |
| :-- | :-- |
| `kb_search` | 全文搜（标题 / 主题 / 标签 / 摘要 / 正文），可按主题、二级主题、标签过滤 |
| `kb_get` | 按 id 取正文；只给关键词时命中一篇就直接返回 |
| `kb_save` | 新建；带 `id` 时只覆盖给出的字段 |
| `kb_update` | 只改传入的字段，`clear` 清空指定字段 |
| `kb_delete` | 删一篇（会先确认是哪篇） |

### 数据放在哪

| 位置 | 说明 |
| :-- | :-- |
| `~/.dsh-kb/data/kb.json` | 默认位置（用户目录下） |
| 环境变量 `KB_STORE_DIR` | 指定别的目录，例如放在同步盘或移动盘上 |

备份 = 复制 `kb.json`；换机器 = 把它放回去。写入是原子替换，手工编辑也不会被旧缓存盖掉。

### 系统提示里的开销

默认「只带索引」：分类计数 + 每个一级主题下最多 3 条标题。32 篇文档约 1100 字，不含任何正文；正文只在 `kb_get` 时才进上下文。库里文档再多，提示词也不会跟着膨胀。

### 目录结构

```text
dsh-kb/
├── index.js            Host 半边：HTTP 接口 + 五个工具 + 系统提示索引
├── store.js            存储：JSON、两级分类、标签、全文检索
├── client.js           浏览器半边：侧栏面板 + 输入框引用按钮
├── cordis.patch.yml    插件行声明
├── screenshots.json    市场截图声明
├── assets/             banner / 图标 / 界面示意
└── locale/             zh / en 元数据
```

### 本地开发

```bash
git clone https://github.com/qiyaogongfang/dsh-kb.git
cd dsh-kb
```

把该目录作为插件装进 profile（插件管理里选本地目录，或 `install_bundle` target 填绝对路径），改完刷新页面即可。发版走 npm + OIDC：改 `package.json` 版本 → 推 `v*` tag → GitHub Actions 自动发布并附 provenance。

### 常见问题

- **插件市场搜不到？** 市场读的是精选列表，收录后才会出现；在那之前用上面的命令直接装。
- **会不会把我的文档传出去？** 不会。插件只读写本机 `kb.json`，没有网络请求。
- **能多人共用吗？** 能。把 `KB_STORE_DIR` 指到共享目录即可，但同一时间最好只让一个 agent 写。

[问题反馈](https://github.com/qiyaogongfang/dsh-kb/issues) · [更新记录](CHANGELOG.md) · [MIT License](LICENSE) · 作者 [qiyaogongfang](https://github.com/qiyaogongfang)
