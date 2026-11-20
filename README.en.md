<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/qiyaogongfang/dsh-kb@v1.0.3/assets/icon-512.png" alt="dsh-kb" width="96">
</p>

<h1 align="center">dsh-kb</h1>

<p align="center"><strong>A local-first knowledge base for DeepSeek Harness.</strong><br>
Two-level topics · free tags · full-text search · one <code>kb.json</code> holds everything</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@qiyaogongfang/dsh-kb"><img src="https://img.shields.io/npm/v/@qiyaogongfang/dsh-kb?style=for-the-badge&color=3E7C8C&logo=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@qiyaogongfang/dsh-kb"><img src="https://img.shields.io/npm/dm/@qiyaogongfang/dsh-kb?style=for-the-badge&color=D9B24C" alt="monthly downloads" /></a>
  <img src="https://img.shields.io/badge/DSH-%E2%89%A5%200.2.2--rc.1-1B2A3C?style=for-the-badge" alt="DSH >= 0.2.2-rc.1" />
  <img src="https://img.shields.io/badge/dependencies-0-3E7C8C?style=for-the-badge" alt="zero runtime dependencies" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/qiyaogongfang/dsh-kb?style=for-the-badge&color=5FA8B2" alt="MIT License" /></a>
</p>

<p align="center"><a href="README.md">中文</a> · <a href="https://github.com/qiyaogongfang/dsh-kb">⭐ Star</a></p>

### Why dsh-kb?

| Index only | Topics + tags | One JSON |
| :-- | :-- | :-- |
| The system prompt carries counts and a few titles, not document bodies | Two-level topics plus free tags, filterable together | A plain `kb.json` you can back up, sync or edit by hand |

- **Nothing is stuffed into the prompt.** Bodies are fetched only when you ask for a specific entry.
- **Finds things.** Full-text search across title, topic, tags, summary and body, weighted by where the match lands.
- **Your data stays yours.** Atomic writes, automatic reload when another process changes the file, no network calls, nothing uploaded.
- **Zero runtime dependencies.** Install and go.
- **Edit from either side.** Use the sidebar panel, or let the agent call `kb_save` / `kb_update`.

### Install

Search **`dsh-kb`** in DSH's Plugins page and install it (the scope is `@qiyaogongfang/dsh-kb`). Refresh; the **Knowledge Base** icon appears in the sidebar.

Command line / local development:

```bash
# Install into a DSH profile (recommended)
dsh plugin --profile web add @qiyaogongfang/dsh-kb

# Install into the current directory (development)
npm install @qiyaogongfang/dsh-kb

# Clone for local development
git clone https://github.com/qiyaogongfang/dsh-kb.git
```

> There is an unrelated package named `dsh-kb` on npm. This project is `@qiyaogongfang/dsh-kb`.

### Five tools

| Tool | What it does |
| :-- | :-- |
| `kb_search` | Full-text search with topic / sub-topic / tag filters |
| `kb_get` | Read one entry by id, or by a keyword that matches a single entry |
| `kb_save` | Create an entry; with `id`, only the given fields are overwritten |
| `kb_update` | Patch fields; `clear` empties the listed ones |
| `kb_delete` | Delete one entry (asks which one first) |

### Where the data lives

| Location | Notes |
| :-- | :-- |
| `~/.dsh-kb/data/kb.json` | Default, under your home directory |
| `KB_STORE_DIR` | Point it anywhere, e.g. a synced or removable drive |

Back up by copying `kb.json`; move machines by putting it back. Writes are atomic and external edits are picked up automatically.

### Prompt cost

The prompt carries an index only: category counts plus up to three titles per top-level topic. Even a few dozen entries stay around a thousand characters, with no bodies. Bodies enter the context only through `kb_get`, so the prompt does not grow with the library.

### Project layout

```text
dsh-kb/
├── index.js            host side: HTTP API + five tools + prompt index
├── store.js            storage: JSON, two-level topics, tags, full-text search
├── client.js           browser side: sidebar panel + composer reference button
├── cordis.patch.yml    plugin row declaration
├── assets/             banner / icon
└── locale/             zh / en metadata
```

### Local development

Install the cloned directory as a plugin in your profile (local directory in the plugin manager, or `install_bundle` with the absolute path), refresh, and iterate. Releases go through npm + OIDC: bump `package.json`, push a `v*` tag, and GitHub Actions publishes with provenance.

[Issues](https://github.com/qiyaogongfang/dsh-kb/issues) · [Changelog](CHANGELOG.md) · [MIT License](LICENSE) · by [qiyaogongfang](https://github.com/qiyaogongfang)
