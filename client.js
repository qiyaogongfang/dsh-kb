// 知识库 · 浏览器半边
//
// 侧栏加一个「知识库」图标（叠页），主区域三栏：
//   左栏 全部 / 已启用 / 一级主题（展开看二级）；中栏 搜索 + 标签筛选 + 文档卡片；右栏 正文 / 编辑。
// 数据来自 Host 的 POST /kb/api/rpc（同源、自定义头）。样式只用 --dsw-alias-* 主题 token。
window.__ModuleLoader__.load({
  id: '@local/kb',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const PANEL = 'kb'
    const API = '/kb/api/rpc'

    const DICT = {
      zh: {
        panel: '知识库',
        title: '知识库',
        count: (n) => `${n} 篇`,
        search: '搜索标题、摘要、正文',
        newDoc: '新建',
        all: '全部',
        tags: '标签',
        clearTags: '清除标签',
        noTags: '还没有标签',
        allSubs: '全部',
        emptyTitle: '知识库还是空的',
        emptyHint: '右上角「新建」，或者直接在对话里说「记一下 ……」。',
        emptyFilter: '这个范围下还没有文档',
        noMatch: '没有匹配的文档',
        loading: '正在载入知识库',
        loadFail: '知识库打不开',
        edit: '编辑',
        del: '删除',
        delConfirm: '确认删除',
        save: '保存',
        cancel: '取消',
        copy: '复制正文',
        copied: '已复制正文',
        copyFail: '复制失败，请手动选中',
        retry: '重试',
        updated: '更新于',
        chars: (n) => `${n} 字`,
        formTitle: '标题',
        formCategory: '一级主题',
        formSub: '二级主题',
        formSubHint: '可选，写在这条主线下面，例如「Gitee / GitHub 连接」',
        formSummary: '一句话摘要',
        formSummaryHint: '用来在列表和对话索引里认出这篇',
        formTags: '标签',
        formTagsHint: '逗号分隔，用来横向串联和筛选，例如 git, gitee, ssh',
        formBody: '正文',
        formBodyHint: '支持 Markdown：小标题用 ##、列表用 -、命令块用三个反引号包起来。',
        formHint: '主题可以选预置的，也可以直接写新的；标签随便加。',
        needTitle: '标题不能为空',
        saved: '已保存',
        deleted: '已删除',
        history: '修改记录',
        byTool: '对话',
        byUi: '页面',
        noBody: '还没有正文',
        noSummary: '没写摘要',
        newTitle: '新建文档',
        editTitle: '编辑文档',
        loadingDoc: '载入正文…',
        pickHint: '从知识库挑一篇，把引用写进输入框（不搬正文）',
        pickTitle: '从知识库引用',
        pickSub: (n) => `${n} 篇 · 点一篇插入引用`,
        pickSearch: '搜索标题、主题、标签',
        pickEmpty: '没有匹配的文档',
        pickClose: '关闭',
        pickFoot: '点一篇会把「【知识库】标题（分类，id xxx）」插进输入框；发送后我按 id 去取正文，正文不进输入框。',
        indexCopied: '没接上输入框，引用已复制到剪贴板',
        indexCopyFail: '没接上输入框，请手动写下文档 id',
      },
      en: {
        panel: 'Knowledge',
        title: 'Knowledge base',
        count: (n) => `${n} docs`,
        search: 'Search title, summary, body',
        newDoc: 'New',
        all: 'All',
        tags: 'Tags',
        clearTags: 'Clear tags',
        noTags: 'No tags yet',
        allSubs: 'All',
        emptyTitle: 'No documents yet',
        emptyHint: 'Press “New”, or just say “note this down …” in the chat.',
        emptyFilter: 'Nothing in this scope yet',
        noMatch: 'No matching document',
        loading: 'Loading knowledge base',
        loadFail: 'Cannot open the knowledge base',
        edit: 'Edit',
        del: 'Delete',
        delConfirm: 'Confirm delete',
        save: 'Save',
        cancel: 'Cancel',
        copy: 'Copy body',
        copied: 'Body copied',
        copyFail: 'Copy failed, select the text manually',
        retry: 'Retry',
        updated: 'Updated',
        chars: (n) => `${n} chars`,
        enable: 'Always on',
        enableOn: 'Always on',
        enableHint: 'Marks this as a favorite. Its body is only added to every turn when「库注入」is set to 索引+常驻.',
        formTitle: 'Title',
        formCategory: 'Topic',
        formSub: 'Subtopic',
        formSubHint: 'Optional, under the topic — e.g. “Gitee / GitHub connection”',
        formSummary: 'One-line summary',
        formSummaryHint: 'Used to recognize this document in lists and the chat index',
        formTags: 'Tags',
        formTagsHint: 'Comma separated; used for cross-filtering, e.g. git, gitee, ssh',
        formBody: 'Body',
        formBodyHint: 'Markdown works: ## for headings, - for lists, triple backticks for commands.',
        formHint: 'Pick a preset topic or type your own. Tags are free-form.',
        needTitle: 'Title is required',
        saved: 'Saved',
        deleted: 'Deleted',
        history: 'History',
        byTool: 'chat',
        byUi: 'page',
        noBody: 'No body yet',
        noSummary: 'No summary',
        newTitle: 'New document',
        editTitle: 'Edit document',
        loadingDoc: 'Loading…',
        pickHint: 'Pick a document and insert a reference into the composer (not its body)',
        pickTitle: 'Reference from knowledge base',
        pickSub: (n) => `${n} docs · click one to insert a reference`,
        pickSearch: 'Search title, topic, tag',
        pickEmpty: 'No matching document',
        pickClose: 'Close',
        pickFoot: 'Clicking inserts「【知识库】title (topic, id xxx)」into the composer; the body is fetched by id after you send.',
        indexCopied: 'Composer hook unavailable — reference copied to clipboard',
        indexCopyFail: 'Composer hook unavailable — type the document id manually',
      },
    }

    let lang = /^zh/i.test(navigator.language || '') ? 'zh' : 'en'
    const langListeners = new Set()
    function setLang(next) {
      if (!next || next === lang) return
      lang = next
      for (const listener of langListeners) listener()
    }
    function useLang() {
      const [, bump] = React.useState(0)
      React.useEffect(() => {
        const listener = () => bump((n) => n + 1)
        langListeners.add(listener)
        return () => langListeners.delete(listener)
      }, [])
      return lang
    }

    async function rpc(action, payload) {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-kb': '1' },
        body: JSON.stringify({ action, ...(payload || {}) }),
      })
      let body = null
      try {
        body = await response.json()
      } catch {
        throw new Error(`HTTP ${response.status}`)
      }
      if (!response.ok || !body || body.ok !== true) throw new Error((body && body.error) || `HTTP ${response.status}`)
      return body.data
    }

    function formatTime(iso) {
      if (!iso) return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      const pad = (value) => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    async function writeClipboard(value) {
      try {
        await navigator.clipboard.writeText(value)
        return true
      } catch {
        return false
      }
    }

    const ICON_PROPS = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    }

    // 签名元素：叠起来的纸页 + 书签带。
    function Pages(props) {
      const size = props.size || 18
      return h('svg', { ...ICON_PROPS, width: size, height: size },
        h('path', { d: 'M6 5.2v13.3A1.5 1.5 0 0 0 7.5 20H17' }),
        h('rect', { x: 9, y: 3, width: 11, height: 15, rx: 2 }),
        h('path', { d: 'M12 7h5M12 10.2h5M12 13.4h3' }))
    }

    function Bookmark(props) {
      return h('svg', { ...ICON_PROPS, width: props.size || 12, height: 12, strokeWidth: 1.8, 'aria-hidden': 'true' },
        h('path', { d: 'M6 3.6h12v17l-6-4.4-6 4.4z' }))
    }

    function Caret(props) {
      return h('svg', { ...ICON_PROPS, width: 12, height: 12, strokeWidth: 1.8, 'aria-hidden': 'true',
        style: { transform: props.open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' } },
        h('path', { d: 'M9 5l7 7-7 7' }))
    }

    const CSS = `
.kb-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  font-family: "Geist", "PingFang SC", "HarmonyOS Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif; font-size: 14px; line-height: 1.6; }
.kb-root *, .kb-root *::before, .kb-root *::after { box-sizing: border-box; }
.kb-head { display: flex; align-items: center; gap: 10px; padding: 13px 20px; border-bottom: 1px solid var(--dsw-alias-border-l1); flex: none; }
.kb-head-mark { display: flex; color: var(--dsw-alias-brand-primary); }
.kb-head-title { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
.kb-head-count { font-size: 12px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.kb-head-spacer { flex: 1; }
.kb-select { height: 28px; padding: 0 6px; font: inherit; font-size: 12px; color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; cursor: pointer; }
.kb-select:hover { color: var(--dsw-alias-label-primary); }
.kb-body { flex: 1; min-height: 0; display: flex; }

.kb-rail { width: 196px; flex: none; border-right: 1px solid var(--dsw-alias-border-l1); padding: 10px 8px 20px; overflow-y: auto; }
.kb-rail-item { display: flex; align-items: center; gap: 6px; width: 100%; height: 30px; padding: 0 8px; margin-bottom: 1px; border: none; border-radius: 6px;
  background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.kb-rail-item:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.kb-rail-item[data-active="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 500; }
.kb-rail-caret { display: flex; flex: none; color: var(--dsw-alias-label-secondary); opacity: 0.75; }
.kb-rail-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-rail-count { flex: none; font-size: 11.5px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.kb-rail-item[data-active="true"] .kb-rail-count { color: var(--dsw-alias-label-primary); }
.kb-rail-sub { height: 26px; padding-left: 20px; font-size: 12.5px; }
.kb-rail-sub .kb-rail-text { font-weight: 400; }
.kb-rail-sep { height: 1px; margin: 8px 9px; background: var(--dsw-alias-border-l1); }

.kb-list { width: 306px; flex: none; border-right: 1px solid var(--dsw-alias-border-l1); display: flex; flex-direction: column; min-height: 0; }
.kb-search { padding: 11px 12px 8px; }
.kb-tagbar { padding: 0 12px 9px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.kb-tagbar-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.kb-tagbar-head .kb-grow { flex: 1; }
.kb-tagbar-list { display: flex; flex-wrap: wrap; gap: 5px; max-height: 92px; overflow-y: auto; }
.kb-tag { height: 22px; padding: 0 8px; font: inherit; font-size: 11.5px; line-height: 1.2; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; white-space: nowrap; }
.kb-tag:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.kb-tag[data-active="true"] { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); }
.kb-tag-count { opacity: 0.7; margin-left: 3px; font-variant-numeric: tabular-nums; }
.kb-items { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 8px 18px; }
.kb-card { display: block; width: 100%; padding: 9px 10px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: inherit;
  font: inherit; text-align: left; cursor: pointer; }
.kb-card + .kb-card { margin-top: 2px; }
.kb-card:hover { background: var(--dsw-alias-bg-layer-1); }
.kb-card[data-active="true"] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l1); }
.kb-card-top { display: flex; align-items: center; gap: 6px; }
.kb-card-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-card-sum { margin-top: 2px; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.kb-card-meta { margin-top: 5px; display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums; overflow: hidden; white-space: nowrap; }
.kb-chip { flex: none; font-size: 11px; line-height: 16px; padding: 0 5px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 4px;
  color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.kb-chip-tag { border-style: dashed; }
.kb-flag { flex: none; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; line-height: 16px; padding: 0 5px; border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); white-space: nowrap; }
.kb-flag-mark { display: flex; color: var(--dsw-alias-brand-primary); }

.kb-detail { flex: 1; min-width: 0; overflow-y: auto; padding: 22px 28px 48px; position: relative; }
.kb-detail-inner { max-width: 74ch; }
.kb-detail-title { font-size: 20px; font-weight: 600; line-height: 1.3; letter-spacing: -0.01em; text-wrap: balance; word-break: break-word; }
.kb-detail-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 7px; font-size: 12px;
  color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.kb-detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-bottom: 16px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.kb-summary { margin-top: 16px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1); font-size: 13px; line-height: 1.65; color: var(--dsw-alias-label-primary); }
.kb-body-text { margin-top: 18px; font-size: 14px; line-height: 1.78; overflow-wrap: anywhere; }
.kb-body-text > *:first-child { margin-top: 0; }
.kb-body-text h2, .kb-body-text h3, .kb-body-text h4, .kb-body-text h5, .kb-body-text h6 { margin: 22px 0 8px; font-weight: 600; line-height: 1.35; letter-spacing: -0.005em; }
.kb-body-text h2 { font-size: 17px; }
.kb-body-text h3 { font-size: 15px; }
.kb-body-text h4, .kb-body-text h5, .kb-body-text h6 { font-size: 14px; }
.kb-body-text p { margin: 10px 0; }
.kb-body-text ul, .kb-body-text ol { margin: 10px 0; padding-left: 20px; }
.kb-body-text li { margin: 3px 0; }
.kb-body-text li::marker { color: var(--dsw-alias-label-secondary); }
.kb-body-text code { font-family: "Geist Mono", "SFMono-Regular", Menlo, "Noto Sans CJK SC", monospace; font-size: 12.8px;
  padding: 1px 4px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); }
.kb-pre { margin: 12px 0; padding: 10px 12px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1); overflow-x: auto; }
.kb-pre code { font-family: "Geist Mono", "SFMono-Regular", Menlo, "Noto Sans CJK SC", monospace; font-size: 12.8px; line-height: 1.65;
  padding: 0; border: none; background: transparent; white-space: pre; }
.kb-quote { margin: 12px 0; padding: 2px 0 2px 12px; border-left: 2px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }

.kb-btn { height: 30px; padding: 0 11px; font: inherit; font-size: 13px; line-height: 1.2; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); cursor: pointer; white-space: nowrap; }
.kb-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.kb-btn:focus-visible, .kb-input:focus-visible, .kb-textarea:focus-visible, .kb-rail-item:focus-visible, .kb-card:focus-visible, .kb-switch:focus-visible, .kb-tag:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.kb-btn-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); background: transparent; font-weight: 500; }
.kb-btn-primary:hover { background: var(--dsw-alias-bg-layer-1); }
.kb-btn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); background: transparent; }
.kb-btn-ghost { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); padding: 0 7px; }
.kb-btn-ghost:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.kb-btn[disabled] { opacity: 0.5; cursor: default; }

.kb-switch { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 11px 0 8px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12.5px; cursor: pointer; }
.kb-switch:hover { background: var(--dsw-alias-bg-layer-1); }
.kb-switch[aria-checked="true"] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); }
.kb-switch-track { position: relative; flex: none; width: 26px; height: 15px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1); }
.kb-switch[aria-checked="true"] .kb-switch-track { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
.kb-switch-knob { position: absolute; top: 1px; left: 1px; width: 11px; height: 11px; border-radius: 50%; background: var(--dsw-alias-label-primary); transition: transform 140ms ease; }
.kb-switch[aria-checked="true"] .kb-switch-knob { transform: translateX(10px); background: var(--dsw-alias-bg-base); }

.kb-input, .kb-textarea { width: 100%; font: inherit; color: inherit; background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; }
.kb-input { height: 32px; padding: 0 10px; font-size: 13px; }
.kb-textarea { padding: 8px 10px; font-size: 13px; line-height: 1.7; resize: vertical; }
.kb-textarea-body { min-height: 320px; font-family: "Geist Mono", "SFMono-Regular", Menlo, "Noto Sans CJK SC", monospace; font-size: 12.8px; line-height: 1.75; }
.kb-form { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; max-width: 660px; }
.kb-label { display: block; font-size: 12px; color: var(--dsw-alias-label-secondary); margin-bottom: 5px; }
.kb-hint { font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.kb-row { display: flex; gap: 10px; align-items: center; }
.kb-grow { flex: 1; min-width: 0; }

.kb-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100%; min-height: 300px;
  text-align: center; color: var(--dsw-alias-label-secondary); padding: 24px; }
.kb-empty-mark { color: var(--dsw-alias-label-secondary); opacity: 0.8; }
.kb-empty-title { font-size: 14px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.kb-empty-hint { font-size: 12.5px; max-width: 28em; text-wrap: pretty; }
.kb-banner { margin: 0 0 16px; padding: 10px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px;
  color: var(--dsw-alias-state-error-primary); font-size: 12.5px; line-height: 1.6; word-break: break-word; }
.kb-toast { position: absolute; left: 22px; bottom: 16px; z-index: 2; padding: 5px 10px; border-radius: 6px; font-size: 12px;
  border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.kb-history-row { font-size: 12px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; line-height: 1.9; }

@media (max-width: 1180px) {
  .kb-rail { width: 172px; }
  .kb-list { width: 280px; }
  .kb-detail { padding: 18px 20px 40px; }
}
@media (max-width: 1060px) {
  .kb-body { flex-direction: column; }
  .kb-rail { width: auto; max-height: 148px; border-right: none;
    border-bottom: 1px solid var(--dsw-alias-border-l1); padding: 8px 12px; }
  .kb-rail-item { height: 27px; }
  .kb-rail-sub { padding-left: 16px; }
  .kb-rail-sep { margin: 6px 9px; }
  .kb-list { width: auto; max-height: 40%; border-right: none; border-bottom: 1px solid var(--dsw-alias-border-l1); }
  .kb-body-text { font-size: 13.5px; }
}
`

    // —— 极简 Markdown 渲染：标题 / 列表 / 代码块 / 引用 / 行内 code 与 **粗体** ——
    const INLINE_RE = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g

    function renderInline(text, prefix) {
      const nodes = []
      let last = 0
      let index = 0
      let match
      INLINE_RE.lastIndex = 0
      while ((match = INLINE_RE.exec(text))) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        if (token.startsWith('`')) {
          nodes.push(h('code', { key: `${prefix}-c${index++}` }, token.slice(1, -1)))
        } else {
          nodes.push(h('strong', { key: `${prefix}-b${index++}` }, token.slice(2, -2)))
        }
        last = match.index + token.length
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    const BLOCK_START = /^\s*(```|#{1,6}\s|[-*+]\s|>\s?|\d+[.)]\s)/

    function renderBody(body) {
      const lines = String(body || '').replace(/\r\n/g, '\n').split('\n')
      const blocks = []
      let i = 0
      let key = 0
      while (i < lines.length) {
        const line = lines[i]
        if (!line.trim()) {
          i++
          continue
        }
        if (/^\s*```/.test(line)) {
          const code = []
          i++
          while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++])
          i++
          blocks.push(h('pre', { key: `b${key++}`, className: 'kb-pre' }, h('code', null, code.join('\n'))))
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = Math.min(heading[1].length + 1, 6)
          blocks.push(h(`h${level}`, { key: `b${key++}` }, renderInline(heading[2], `h${i}`)))
          i++
          continue
        }
        if (/^\s*[-*+]\s+/.test(line)) {
          const items = []
          while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''))
          blocks.push(h('ul', { key: `b${key++}` }, items.map((item, index) => h('li', { key: index }, renderInline(item, `u${i}-${index}`)))))
          continue
        }
        if (/^\s*\d+[.)]\s+/.test(line)) {
          const items = []
          while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))
          blocks.push(h('ol', { key: `b${key++}` }, items.map((item, index) => h('li', { key: index }, renderInline(item, `o${i}-${index}`)))))
          continue
        }
        if (/^\s*>\s?/.test(line)) {
          const quote = []
          while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''))
          blocks.push(h('blockquote', { key: `b${key++}`, className: 'kb-quote' }, renderInline(quote.join(' '), `q${i}`)))
          continue
        }
        const para = []
        while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) para.push(lines[i++].trim())
        if (!para.length) para.push(lines[i++].trim())
        blocks.push(h('p', { key: `b${key++}` }, renderInline(para.join(' '), `p${i}`)))
      }
      return blocks
    }

    function DocForm(props) {
      const t = props.t
      const initial = props.initial
      const editing = Boolean(initial.id)
      const [draft, setDraft] = React.useState(() => ({
        title: initial.title || '',
        category: initial.category || '',
        sub: initial.sub || '',
        summary: initial.summary || '',
        tags: (initial.tags || []).join(', '),
        body: initial.body || '',
      }))
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }))

      async function submit(event) {
        event.preventDefault()
        if (!String(draft.title || '').trim()) {
          setError(t.needTitle)
          return
        }
        setBusy(true)
        setError('')
        try {
          await props.onSave({
            id: initial.id,
            title: draft.title,
            category: draft.category,
            sub: draft.sub,
            summary: draft.summary,
            tags: draft.tags,
            body: draft.body,
          })
        } catch (problem) {
          setError(problem && problem.message ? problem.message : String(problem))
        } finally {
          setBusy(false)
        }
      }

      const subOptions = props.subOptions || []

      return h('form', { className: 'kb-form', onSubmit: submit },
        error ? h('div', { className: 'kb-banner' }, error) : null,
        h('div', null,
          h('label', { className: 'kb-label', htmlFor: 'kb-f-title' }, t.formTitle),
          h('input', { id: 'kb-f-title', className: 'kb-input', value: draft.title, onChange: set('title'), autoFocus: true })),
        h('div', { className: 'kb-row' },
          h('div', { className: 'kb-grow' },
            h('label', { className: 'kb-label', htmlFor: 'kb-f-cat' }, t.formCategory),
            h('input', { id: 'kb-f-cat', className: 'kb-input', value: draft.category, onChange: set('category'), list: 'kb-cat-list' }),
            h('datalist', { id: 'kb-cat-list' }, props.categories.map((name) => h('option', { key: name, value: name })))),
          h('div', { className: 'kb-grow' },
            h('label', { className: 'kb-label', htmlFor: 'kb-f-sub' }, t.formSub),
            h('input', { id: 'kb-f-sub', className: 'kb-input', value: draft.sub, onChange: set('sub'), list: 'kb-sub-list', placeholder: t.formSubHint }),
            h('datalist', { id: 'kb-sub-list' }, subOptions.map((name) => h('option', { key: name, value: name }))))),
        h('div', null,
          h('label', { className: 'kb-label', htmlFor: 'kb-f-sum' }, t.formSummary),
          h('input', { id: 'kb-f-sum', className: 'kb-input', value: draft.summary, onChange: set('summary'), placeholder: t.formSummaryHint })),
        h('div', null,
          h('label', { className: 'kb-label', htmlFor: 'kb-f-tags' }, t.formTags),
          h('input', { id: 'kb-f-tags', className: 'kb-input', value: draft.tags, onChange: set('tags'), placeholder: t.formTagsHint })),
        h('div', null,
          h('label', { className: 'kb-label', htmlFor: 'kb-f-body' }, t.formBody),
          h('textarea', { id: 'kb-f-body', className: 'kb-textarea kb-textarea-body', value: draft.body, onChange: set('body'), spellCheck: false }),
          h('div', { className: 'kb-hint', style: { marginTop: '6px' } }, t.formBodyHint)),
        h('div', { className: 'kb-hint' }, t.formHint),
        h('div', { className: 'kb-row' },
          h('button', { type: 'submit', className: 'kb-btn kb-btn-primary', disabled: busy }, t.save),
          h('button', { type: 'button', className: 'kb-btn', onClick: props.onCancel }, t.cancel)))
    }

    function Panel() {
      const language = useLang()
      const t = DICT[language] || DICT.zh

      const [phase, setPhase] = React.useState('loading')
      const [status, setStatus] = React.useState(null)
      const [error, setError] = React.useState('')
      const [items, setItems] = React.useState([])
      const [query, setQuery] = React.useState('')
      const [hits, setHits] = React.useState(null)
      const [activeCat, setActiveCat] = React.useState(null)
      const [activeSub, setActiveSub] = React.useState(null)
      const [activeTags, setActiveTags] = React.useState([])
      const [selectedId, setSelectedId] = React.useState(null)
      const [doc, setDoc] = React.useState(null)
      const [mode, setMode] = React.useState('view')
      const [confirmDelete, setConfirmDelete] = React.useState(false)
      const [toast, setToast] = React.useState('')

      const flash = React.useCallback((message) => {
        setToast(message)
        window.setTimeout(() => setToast((current) => (current === message ? '' : current)), 2000)
      }, [])

      const load = React.useCallback(async () => {
        try {
          const info = await rpc('status')
          setStatus(info)
          if (!info.ok) {
            setPhase('error')
            setError(info.error || '')
            return
          }
          const data = await rpc('list', {})
          setItems(data.items)
          setPhase('ready')
          setError('')
        } catch (problem) {
          setPhase('error')
          setError(problem && problem.message ? problem.message : String(problem))
        }
      }, [])

      React.useEffect(() => {
        load()
      }, [load])

      const categories = React.useMemo(() => (status && status.categories) || [], [status])

      const categoryNames = React.useMemo(() => {
        const names = categories.map((item) => item.name)
        if (doc && doc.category && !names.includes(doc.category)) names.push(doc.category)
        return names
      }, [categories, doc])

      const subOptions = React.useMemo(() => {
        const names = []
        if (doc && doc.sub) names.push(doc.sub)
        for (const item of categories) for (const sub of item.subs || []) if (!names.includes(sub.name)) names.push(sub.name)
        for (const item of items) if (item.sub && !names.includes(item.sub)) names.push(item.sub)
        return names
      }, [categories, items, doc])

      // 搜索走后端（正文也要搜）；输入停下来 200ms 再发。
      const trimmed = query.trim()
      React.useEffect(() => {
        if (!trimmed) {
          setHits(null)
          return
        }
        let alive = true
        const timer = window.setTimeout(async () => {
          try {
            const result = await rpc('search', {
              query: trimmed,
              category: activeCat || undefined,
              sub: activeSub || undefined,
              tags: activeTags,
            })
            if (alive) setHits(result.items)
          } catch {
            if (alive) setHits([])
          }
        }, 200)
        return () => {
          alive = false
          window.clearTimeout(timer)
        }
      }, [trimmed, activeCat, activeSub, activeTags])

      const visible = React.useMemo(() => {
        if (trimmed) return hits || []
        return items.filter((item) => {
          if (activeCat && item.category !== activeCat) return false
          if (activeSub && item.sub !== activeSub) return false
          if (activeTags.length && !activeTags.every((tag) => (item.tags || []).includes(tag))) return false
          return true
        })
      }, [items, hits, activeCat, activeSub, activeTags, trimmed])

      React.useEffect(() => {
        setConfirmDelete(false)
        if (!selectedId) {
          setDoc(null)
          return
        }
        if (doc && doc.id === selectedId) return
        let alive = true
        rpc('get', { id: selectedId })
          .then((value) => {
            if (alive) setDoc(value)
          })
          .catch((problem) => {
            if (alive) flash(problem && problem.message ? problem.message : String(problem))
          })
        return () => {
          alive = false
        }
      }, [selectedId, doc, flash])

      const tagChips = React.useMemo(() => {
        const all = (status && status.tags) || []
        const shown = all.slice(0, 24)
        const extra = []
        for (const tag of activeTags) if (!shown.some((item) => item.name === tag)) extra.push({ name: tag, count: 0 })
        return [...shown, ...extra]
      }, [status, activeTags])

      function toggleTag(name) {
        setActiveTags((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]))
      }

      function pickCategory(name) {
        if (activeCat === name) {
          setActiveCat(null)
          setActiveSub(null)
          return
        }
        setActiveCat(name)
        setActiveSub(null)
      }

      async function refresh({ keepId } = {}) {
        const info = await rpc('status')
        setStatus(info)
        const data = await rpc('list', {})
        setItems(data.items)
        if (trimmed) {
          const result = await rpc('search', {
            query: trimmed,
            category: activeCat || undefined,
            sub: activeSub || undefined,
            tags: activeTags,
          })
          setHits(result.items)
        }
        if (keepId) {
          const fresh = await rpc('get', { id: keepId })
          setDoc(fresh)
          setSelectedId(fresh.id)
        }
      }

      async function saveDraft(payload) {
        const saved = await rpc('save', { entry: payload })
        setMode('view')
        setDoc(saved)
        setSelectedId(saved.id)
        await refresh()
        flash(t.saved)
      }

      async function copyBody() {
        if (!doc || !doc.body) return
        const ok = await writeClipboard(doc.body)
        flash(ok ? t.copied : t.copyFail)
      }

      async function removeDoc() {
        if (!doc) return
        try {
          await rpc('delete', { id: doc.id })
          setSelectedId(null)
          setDoc(null)
          setMode('view')
          setConfirmDelete(false)
          await refresh()
          flash(t.deleted)
        } catch (problem) {
          flash(problem && problem.message ? problem.message : String(problem))
        }
      }

      function startNew() {
        setSelectedId(null)
        setDoc(null)
        setMode('edit')
      }

      const ready = phase === 'ready'
      const head = h('div', { className: 'kb-head' },
        h('span', { className: 'kb-head-mark' }, h(Pages, { size: 17 })),
        h('span', { className: 'kb-head-title' }, t.title),
        h('span', { className: 'kb-head-count' }, ready ? t.count(items.length) : ''),
        h('span', { className: 'kb-head-spacer' }),
        ready ? h('button', { className: 'kb-btn kb-btn-primary', onClick: startNew }, t.newDoc) : null)

      if (phase === 'loading') {
        return h('div', { className: 'kb-root' },
          h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
          head,
          h('div', { className: 'kb-empty' },
            h('span', { className: 'kb-empty-mark' }, h(Pages, { size: 32 })),
            h('div', { className: 'kb-empty-hint' }, t.loading)))
      }

      if (phase === 'error') {
        return h('div', { className: 'kb-root' },
          h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
          head,
          h('div', { className: 'kb-detail' },
            h('div', { className: 'kb-banner' }, `${t.loadFail}：${error || '未知原因'}`),
            h('button', { className: 'kb-btn', onClick: () => { setPhase('loading'); load() } }, t.retry)))
      }

      // —— 左栏：全部 / 一级主题（点开看二级）
      const railRows = []
      railRows.push(h('button', {
        key: 'all',
        type: 'button',
        className: 'kb-rail-item',
        'data-active': String(!activeCat),
        onClick: () => { setActiveCat(null); setActiveSub(null) },
      },
        h('span', { className: 'kb-rail-text' }, t.all),
        h('span', { className: 'kb-rail-count' }, String(items.length))))

      railRows.push(h('div', { key: 'sep', className: 'kb-rail-sep' }))

      for (const item of categories) {
        const open = activeCat === item.name
        railRows.push(h('button', {
          key: `c:${item.name}`,
          type: 'button',
          className: 'kb-rail-item',
          'data-active': String(open && !activeSub),
          onClick: () => pickCategory(item.name),
          title: item.name,
        },
          h('span', { className: 'kb-rail-caret' }, h(Caret, { open: open && Boolean(item.subs.length) })),
          h('span', { className: 'kb-rail-text' }, item.name),
          h('span', { className: 'kb-rail-count' }, String(item.count))))

        if (open) {
          for (const sub of item.subs || []) {
            railRows.push(h('button', {
              key: `s:${item.name}:${sub.name}`,
              type: 'button',
              className: 'kb-rail-item kb-rail-sub',
              'data-active': String(activeSub === sub.name),
              onClick: () => setActiveSub(activeSub === sub.name ? null : sub.name),
              title: sub.name,
            },
              h('span', { className: 'kb-rail-text' }, sub.name),
              h('span', { className: 'kb-rail-count' }, String(sub.count))))
          }
        }
      }

      const rail = h('nav', { className: 'kb-rail' }, railRows)

      // —— 标签筛选条
      const tagbar = tagChips.length
        ? h('div', { className: 'kb-tagbar' },
            h('div', { className: 'kb-tagbar-head' },
              h('span', null, `${t.tags}${activeTags.length ? ` · ${activeTags.length}` : ''}`),
              h('span', { className: 'kb-grow' }),
              activeTags.length
                ? h('button', {
                    type: 'button',
                    className: 'kb-btn kb-btn-ghost',
                    style: { height: '20px', fontSize: '11.5px' },
                    onClick: () => setActiveTags([]),
                  }, t.clearTags)
                : null),
            h('div', { className: 'kb-tagbar-list' },
              tagChips.map((tag) => h('button', {
                key: tag.name,
                type: 'button',
                className: 'kb-tag',
                'data-active': String(activeTags.includes(tag.name)),
                onClick: () => toggleTag(tag.name),
              },
                `#${tag.name}`,
                tag.count ? h('span', { className: 'kb-tag-count' }, String(tag.count)) : null))))
        : null

      const list = h('div', { className: 'kb-list' },
        h('div', { className: 'kb-search' },
          h('input', {
            className: 'kb-input',
            placeholder: t.search,
            value: query,
            onChange: (event) => setQuery(event.target.value),
            'aria-label': t.search,
          })),
        tagbar,
        h('div', { className: 'kb-items' },
          visible.length === 0
            ? h('div', { className: 'kb-empty', style: { minHeight: '160px' } },
                h('span', { className: 'kb-empty-mark' }, h(Pages, { size: 26 })),
                h('div', { className: 'kb-empty-hint' },
                  trimmed ? t.noMatch : items.length ? t.emptyFilter : t.emptyTitle))
            : visible.map((item) => h('button', {
                key: item.id,
                type: 'button',
                className: 'kb-card',
                'data-active': String(item.id === selectedId),
                onClick: () => { setSelectedId(item.id); setMode('view') },
              },
                h('div', { className: 'kb-card-top' },
                  h('span', { className: 'kb-card-title' }, item.title)),
                h('div', { className: 'kb-card-sum' }, item.snippet || item.summary || t.noSummary),
                h('div', { className: 'kb-card-meta' },
                  h('span', { className: 'kb-chip' }, item.sub ? `${item.category} / ${item.sub}` : item.category),
                  (item.tags || []).slice(0, 2).map((tag) => h('span', { key: tag, className: 'kb-chip kb-chip-tag' }, `#${tag}`)),
                  h('span', null, formatTime(item.updated_at)))))))

      let detail
      if (mode === 'edit') {
        detail = h('div', { className: 'kb-detail' },
          h('div', { className: 'kb-detail-inner' },
            h('div', { className: 'kb-detail-title' }, doc ? t.editTitle : t.newTitle),
            h(DocForm, {
              key: doc ? doc.id : 'new',
              t,
              categories: categoryNames,
              subOptions,
              initial: doc || { title: '', category: activeCat || '', sub: activeSub || '', summary: '', tags: [], body: '' },
              onSave: saveDraft,
              onCancel: () => { setMode('view'); if (!doc) setSelectedId(null) },
            })))
      } else if (!selectedId) {
        detail = h('div', { className: 'kb-detail' },
          h('div', { className: 'kb-empty' },
            h('span', { className: 'kb-empty-mark' }, h(Pages, { size: 40 })),
            h('div', { className: 'kb-empty-title' }, items.length ? t.emptyFilter : t.emptyTitle),
            h('div', { className: 'kb-empty-hint' }, t.emptyHint),
            h('button', { className: 'kb-btn kb-btn-primary', onClick: startNew }, t.newDoc)))
      } else if (!doc) {
        detail = h('div', { className: 'kb-detail' },
          h('div', { className: 'kb-empty' }, h('div', { className: 'kb-empty-hint' }, t.loadingDoc)))
      } else {
        const fields = []
        if (doc.history && doc.history.length) {
          fields.push(h('div', { key: 'history' },
            h('div', { className: 'kb-label', style: { marginTop: '18px' } }, t.history),
            doc.history.slice(-4).reverse().map((item, index) => h('div', { key: index, className: 'kb-history-row' },
              `${formatTime(item.at)} · ${item.fields.join('、')} · ${item.source === 'tool' ? t.byTool : t.byUi}`))))
        }
        detail = h('div', { className: 'kb-detail' },
          h('div', { className: 'kb-detail-inner' },
            h('div', { className: 'kb-detail-title' }, doc.title),
            h('div', { className: 'kb-detail-meta' },
              h('button', {
                type: 'button',
                className: 'kb-chip',
                style: { cursor: 'pointer', background: 'transparent' },
                onClick: () => { setActiveCat(doc.category); setActiveSub(doc.sub || null) },
                title: doc.category,
              }, doc.category),
              doc.sub
                ? h('button', {
                    type: 'button',
                    className: 'kb-chip',
                    style: { cursor: 'pointer', background: 'transparent' },
                    onClick: () => { setActiveCat(doc.category); setActiveSub(doc.sub) },
                    title: doc.sub,
                  }, doc.sub)
                : null,
              h('span', null, `${t.updated} ${formatTime(doc.updated_at)}`),
              h('span', null, t.chars(doc.body_length))),
            h('div', { className: 'kb-detail-actions' },
              h('button', { className: 'kb-btn', onClick: () => { setMode('edit'); setConfirmDelete(false) } }, t.edit),
              h('button', { className: 'kb-btn kb-btn-ghost', onClick: copyBody, disabled: !doc.body }, t.copy),
              confirmDelete
                ? h('button', { className: 'kb-btn kb-btn-danger', onClick: removeDoc }, t.delConfirm)
                : h('button', { className: 'kb-btn kb-btn-danger', onClick: () => setConfirmDelete(true) }, t.del),
              confirmDelete ? h('button', { className: 'kb-btn', onClick: () => setConfirmDelete(false) }, t.cancel) : null),
            doc.summary ? h('div', { className: 'kb-summary' }, doc.summary) : null,
            doc.tags && doc.tags.length
              ? h('div', { className: 'kb-detail-meta', style: { marginTop: '10px' } },
                  doc.tags.map((tag) => h('button', {
                    key: tag,
                    type: 'button',
                    className: 'kb-chip kb-chip-tag',
                    style: { cursor: 'pointer', background: 'transparent' },
                    onClick: () => toggleTag(tag),
                  }, `#${tag}`)))
              : null,
            doc.body
              ? h('div', { className: 'kb-body-text' }, renderBody(doc.body))
              : h('div', { className: 'kb-hint', style: { marginTop: '18px' } }, t.noBody),
            fields))
      }

      return h('div', { className: 'kb-root' },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        head,
        h('div', { className: 'kb-body' }, rail, list, detail),
        toast ? h('div', { className: 'kb-toast' }, toast) : null)
    }

    // —— 输入框左侧的「知识库」按钮：按标签筛文档，点一下把引用写进输入框（只写引用，不写正文）——
    // 输入框的真实契约（dsh-client-ui-conversation 的 SessionInputShell.actions）：
    //   insertText(text, span) 需要 span = captureInsertion()，否则静默返回 false。

    async function tryInsert(props, text, currentDraft) {
      const actions = props.inputActions || {}
      let span = null
      try {
        if (typeof actions.captureInsertion === 'function') span = actions.captureInsertion()
      } catch {
        span = null
      }
      if (span && typeof actions.insertText === 'function') {
        try {
          const result = await actions.insertText(text, span)
          if (result !== false) return 'insertText'
        } catch {
          // 落到下面的 setDraft
        }
      }
      // 兜底：整体设草稿（只在现有草稿是纯文本时安全）
      if (typeof actions.setDraft === 'function' && typeof currentDraft === 'string') {
        try {
          actions.setDraft(currentDraft ? `${currentDraft}\n${text}` : text)
          return 'setDraft'
        } catch {
          // 放弃
        }
      }
      return null
    }

    function referenceLine(doc) {
      const path = doc.sub ? `${doc.category} / ${doc.sub}` : doc.category
      return `【知识库】${doc.title}（${path}，id ${doc.id}）`
    }

    function ComposerButton(props) {
      const language = useLang()
      const t = DICT[language] || DICT.zh
      const [open, setOpen] = React.useState(false)
      const [docs, setDocs] = React.useState([])
      const [tagList, setTagList] = React.useState([])
      const [picked, setPicked] = React.useState([])
      const [query, setQuery] = React.useState('')
      const [note, setNote] = React.useState('')
      const wrapRef = React.useRef(null)

      let inputSnapshot = null
      try {
        inputSnapshot = props.useInput ? props.useInput((value) => value) : null
      } catch {
        inputSnapshot = null
      }

      React.useEffect(() => {
        if (!open) return
        let alive = true
        ;(async () => {
          try {
            const [info, data] = await Promise.all([rpc('status'), rpc('list', {})])
            if (!alive) return
            setDocs(data.items)
            setTagList(info.tags || [])
          } catch {
            if (alive) setDocs([])
          }
        })()
        return () => {
          alive = false
        }
      }, [open])

      React.useEffect(() => {
        if (!open) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [open])

      const filtered = React.useMemo(() => {
        const needle = query.trim().toLowerCase()
        return docs.filter((doc) => {
          if (picked.length && !picked.every((tag) => (doc.tags || []).includes(tag))) return false
          if (!needle) return true
          return [doc.title, doc.summary, doc.category, doc.sub, ...(doc.tags || [])]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle))
        })
      }, [docs, picked, query])

      function toggleTag(tag) {
        setPicked((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]))
      }

      async function choose(doc) {
        const line = referenceLine(doc)
        const draft = inputSnapshot && typeof inputSnapshot.draft === 'string' ? inputSnapshot.draft : undefined
        const used = await tryInsert(props, line, draft)
        if (used) {
          setNote('')
          setOpen(false)
          return
        }
        // 拿不到输入框写入权限时退化为剪贴板，至少不白点
        const ok = await writeClipboard(line)
        setNote(ok ? t.indexCopied : t.indexCopyFail)
      }

      React.useEffect(() => {
        if (!open) return undefined
        const onDown = (event) => {
          const node = wrapRef.current
          if (node && !node.contains(event.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown, true)
        return () => document.removeEventListener('mousedown', onDown, true)
      }, [open])

      const button = h('button', {
        type: 'button',
        className: 'kb-composer-btn',
        title: t.pickHint,
        'aria-label': t.pickTitle,
        onClick: () => { setNote(''); setOpen((value) => !value) },
      }, h(Pages, { size: 15 }), h('span', null, t.panel))

      const panel = !open ? null : h('div', { className: 'kb-pick', role: 'dialog', 'aria-label': t.pickTitle },
        h('div', { className: 'kb-pick-head' },
          h('span', { className: 'kb-pick-title' }, t.pickTitle),
          h('span', { className: 'kb-pick-sub' }, t.pickSub(filtered.length)),
          h('span', { className: 'kb-grow' }),
          h('button', { type: 'button', className: 'kb-btn kb-btn-ghost', onClick: () => setOpen(false) }, t.pickClose)),
        h('div', { className: 'kb-pick-search' },
          h('input', {
            className: 'kb-input',
            placeholder: t.pickSearch,
            value: query,
            autoFocus: true,
            onChange: (event) => setQuery(event.target.value),
          })),
        tagList.length
          ? h('div', { className: 'kb-pick-tags' },
              tagList.slice(0, 18).map((tag) => h('button', {
                key: tag.name,
                type: 'button',
                className: 'kb-tag',
                'data-active': String(picked.includes(tag.name)),
                onClick: () => toggleTag(tag.name),
              }, `#${tag.name}`, h('span', { className: 'kb-tag-count' }, String(tag.count)))))
          : null,
        h('div', { className: 'kb-pick-list' },
          filtered.length === 0
            ? h('div', { className: 'kb-pick-empty' }, t.pickEmpty)
            : filtered.map((doc) => h('button', {
                key: doc.id,
                type: 'button',
                className: 'kb-pick-row',
                onClick: () => choose(doc),
              },
                h('span', { className: 'kb-pick-row-title' }, doc.title),
                h('span', { className: 'kb-pick-row-meta' },
                  h('span', { className: 'kb-chip' }, doc.sub ? `${doc.category} / ${doc.sub}` : doc.category),
                  (doc.tags || []).slice(0, 3).map((tag) => h('span', { key: tag, className: 'kb-chip kb-chip-tag' }, `#${tag}`)))))),
        h('div', { className: 'kb-pick-foot' }, note || t.pickFoot))

      return h('span', { className: 'kb-pick-wrap', ref: wrapRef },
        h('style', { dangerouslySetInnerHTML: { __html: PICK_CSS } }),
        button,
        panel)
    }

    const PICK_CSS = `
.kb-pick-wrap { position: relative; display: inline-flex; }
.kb-composer-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 9px; font: inherit; font-size: 12.5px;
  border-radius: 7px; border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.kb-composer-btn:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l1); }
.kb-composer-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.kb-pick { position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 60; width: min(520px, 88vw);
  max-height: min(54vh, 440px); display: flex; flex-direction: column; overflow: hidden;
  background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22); }
.kb-pick-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px 8px; }
.kb-pick-title { font-size: 13.5px; font-weight: 600; }
.kb-pick-sub { font-size: 11.5px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.kb-pick-search { padding: 0 12px 8px; }
.kb-pick-tags { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px 8px; max-height: 56px; overflow-y: auto; }
.kb-pick-list { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 6px 6px; border-top: 1px solid var(--dsw-alias-border-l1); }
.kb-pick-row { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 7px 9px; border: 1px solid transparent; border-radius: 7px;
  background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.kb-pick-row:hover { background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l1); }
.kb-pick-row:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.kb-pick-row-title { font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-pick-row-meta { display: flex; align-items: center; gap: 5px; overflow: hidden; }
.kb-pick-empty { padding: 22px 12px; text-align: center; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.kb-pick-foot { padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 11px; line-height: 1.45;
  color: var(--dsw-alias-label-secondary); }
`

    function apply(ctx) {
      ctx.inject(['locale'], (scope) => {
        const push = (snapshot) => setLang(/^zh/i.test(snapshot.active || '') ? 'zh' : 'en')
        push(scope.locale.getSnapshot())
        scope.on('locale/change', push)
      })
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register({ name: 'sidebar.panellist', id: PANEL, order: 9, label: () => DICT[lang].panel }, Pages))
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL }, Panel))
      ctx.slots.inject('conversation.input.left', () =>
        ctx.slots.register({ name: 'conversation.input.left', id: 'kb-reference', order: 9, label: () => DICT[lang].panel }, ComposerButton))
    }

    return { inject: ['slots'], apply }
  },
})
