// 知识库 · 本机存储
//
// 一份 JSON 落在 data/kb.json：{ format, docs: [...] }。
// 全部文档常驻内存（system prompt 每步要用同步快照），写盘用「临时文件 + rename 重试」。
// 每次读写前 stat 一下文件，别的进程（比如手工编辑或同步盘）改过就重新载入。
//
// 分类是两级主题树：category（一级，如「Git 与代码托管」）+ sub（二级，如「Gitee / GitHub 连接」）。
// 标签是自由文本，用来跨分类横向串起来（如 #tailscale #安卓 ），可按多个标签做 AND 筛选。
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

export const STORE_FORMAT = '71lab-kb-store-v1'

/** 预置的二级分类主题树。category 与 sub 本身都是自由文本，这里只是候选值。 */
export const CATEGORY_TREE = [
  { name: '环境与工具链', subs: ['Q 盘环境', '网络与远程', '装机与硬件'] },
  { name: 'Git 与代码托管', subs: ['Gitee / GitHub 连接', '分支与提交', '本地仓库与排错', '备份与仓库'] },
  { name: '产品与发布', subs: ['多平台客户端', '小程序', '商店与合规', '支付'] },
  { name: '平台与架构', subs: ['账号与权益', '数据与存储', '接口与契约'] },
  { name: '运维与备份', subs: ['备份与恢复', '服务器与部署', '故障处置'] },
  { name: '安全与密钥', subs: ['密钥与凭据', '权限与红线'] },
  { name: 'Agent 与协作', subs: ['DSH 使用', '会话交接', '协作规范'] },
  { name: '问题记录', subs: ['Windows', '构建与依赖', '第三方服务'] },
]

export const CATEGORY_PRESETS = CATEGORY_TREE.map((item) => item.name)

/** 二级分类候选：某个一级分类下的预置二级 + 数据里实际出现过的。 */
export function subPresets(category) {
  const found = CATEGORY_TREE.find((item) => item.name === category)
  return found ? found.subs : []
}

export const DEFAULT_CATEGORY = '其他'

/**
 * 注入级别（默认 off：知识库只存不用，谁需要谁在对话里点名）：
 *   off    只留一句「有知识库，需要就用 kb_search 查」
 *   digest 分类 + 每类几条标题（省 token 的索引）
 *   full   完整索引（带 id 和摘要）+ 已标记「常驻」的文档全文
 */

const MAX_TITLE = 200
const MAX_SUMMARY = 300
const MAX_CATEGORY = 40
const MAX_SUB = 40
const MAX_BODY = 200_000
const MAX_TAGS = 12
const MAX_TAG = 40

export const HISTORY_LIMIT = 10

/** 存储目录：可用 KB_STORE_DIR 覆盖；若存在 Q:\kb 则用它的 data（作者本机的移动盘布局），否则落在用户目录 ~/.dsh-kb。 */
export function resolveStoreDir(pluginRoot) {
  const fromEnv = (process.env.KB_STORE_DIR || '').trim()
  if (fromEnv) return fromEnv
  if (process.platform === 'win32' && existsSync('Q:\\kb')) return 'Q:\\kb\\data'
  try {
    return join(homedir(), '.dsh-kb')
  } catch {
    return join(pluginRoot || process.cwd(), '..', 'data')
  }
}

function nowIso() {
  return new Date().toISOString()
}

function newId() {
  return `kb_${randomBytes(5).toString('hex')}`
}

function cleanText(value, max) {
  if (value === undefined || value === null) return null
  const text = String(value).replace(/\r\n/g, '\n').trim()
  if (!text) return null
  return text.length > max ? text.slice(0, max) : text
}

export function cleanTags(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,，、\s#]+/) : []
  const tags = []
  for (const item of raw) {
    const tag = cleanText(item, MAX_TAG)
    if (tag && !tags.includes(tag)) tags.push(tag)
    if (tags.length >= MAX_TAGS) break
  }
  return tags
}

/** 字段取值：没传（undefined）= 保持原值；显式传 null = 清空；传值 = 覆盖。 */
function field(input, previous, key, clean) {
  const value = input?.[key]
  if (value === undefined) return previous ? previous[key] ?? null : null
  return clean(value)
}

const TRACKED_FIELDS = [
  ['title', '标题'],
  ['category', '分类'],
  ['sub', '二级分类'],
  ['summary', '摘要'],
  ['body', '正文'],
  ['tags', '标签'],
]

/** 比较前后两条记录，返回被改动的字段中文名（不含值）。 */
export function diffFields(before, after) {
  const changed = []
  for (const [key, label] of TRACKED_FIELDS) {
    const left = before?.[key]
    const right = after?.[key]
    const same = Array.isArray(left) || Array.isArray(right)
      ? JSON.stringify(left || []) === JSON.stringify(right || [])
      : (left ?? null) === (right ?? null)
    if (!same) changed.push(label)
  }
  return changed
}

/** 把外部输入整理成一篇文档。字段级合并：没给的字段沿用 previous，显式 null 才清空。 */
export function normalizeDoc(input, previous) {
  const title = field(input, previous, 'title', (value) => cleanText(value, MAX_TITLE))
  if (!title) throw new Error('标题不能为空')
  const body = field(input, previous, 'body', (value) => cleanText(value, MAX_BODY))
  const category = field(input, previous, 'category', (value) => cleanText(value, MAX_CATEGORY)) || previous?.category || DEFAULT_CATEGORY
  return {
    id: previous?.id || newId(),
    title,
    category,
    sub: field(input, previous, 'sub', (value) => cleanText(value, MAX_SUB)),
    summary: field(input, previous, 'summary', (value) => cleanText(value, MAX_SUMMARY)),
    body,
    tags: field(input, previous, 'tags', (value) => cleanTags(value)) || [],
    created_at: previous?.created_at || nowIso(),
    updated_at: nowIso(),
    history: previous?.history || [],
  }
}

/** 列表用的轻量视图：不带正文。 */
export function docMeta(doc) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    sub: doc.sub || null,
    summary: doc.summary,
    tags: doc.tags || [],
    body_length: doc.body ? doc.body.length : 0,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}

/** 详情视图：带正文和修改记录。 */
export function publicDoc(doc) {
  return { ...docMeta(doc), body: doc.body, history: doc.history || [] }
}

function tokenize(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[\s,，、;；|]+/)
    .map((token) => (token.startsWith('#') ? token.slice(1) : token))
    .filter(Boolean)
}

/** 标签筛选：给了几个标签就要全部命中（AND）。 */
function hasAllTags(doc, wanted) {
  if (!wanted || !wanted.length) return true
  const own = doc.tags || []
  return wanted.every((tag) => own.includes(tag))
}

/**
 * 每个词都要命中（AND），按命中位置加权：标题 > 标签 > 二级分类 > 分类 > 摘要 > 正文。
 */
function scoreDoc(doc, tokens) {
  if (!tokens.length) return 0
  const title = doc.title.toLowerCase()
  const summary = (doc.summary || '').toLowerCase()
  const category = (doc.category || '').toLowerCase()
  const sub = (doc.sub || '').toLowerCase()
  const tags = (doc.tags || []).join(' ').toLowerCase()
  const body = (doc.body || '').toLowerCase()
  let total = 0
  for (const token of tokens) {
    let score = 0
    if (title.includes(token)) score += 12
    if (tags.includes(token)) score += 7
    if (sub.includes(token)) score += 6
    if (category.includes(token)) score += 5
    if (summary.includes(token)) score += 4
    if (body.includes(token)) score += 1
    if (!score) return 0
    total += score
  }
  return total
}

/** 正文里第一处命中的上下文，给搜索结果做预览。 */
function snippetOf(doc, tokens) {
  const body = String(doc.body || '')
  if (!body) return ''
  const lower = body.toLowerCase()
  for (const token of tokens) {
    const at = lower.indexOf(token)
    if (at < 0) continue
    const start = Math.max(0, at - 30)
    const end = Math.min(body.length, at + 60)
    return `${start > 0 ? '…' : ''}${body.slice(start, end).replace(/\s+/g, ' ').trim()}${end < body.length ? '…' : ''}`
  }
  return ''
}

/**
 * 两级分类统计：[{ name, count, subs: [{ name, count }] }]。
 * 预置的一级分类即使为空也列出来，二级分类只列实际有文档的。
 */
export function categoryStats(docs) {
  const map = new Map()
  for (const item of CATEGORY_TREE) map.set(item.name, { name: item.name, count: 0, subs: new Map() })
  for (const doc of docs) {
    const name = doc.category || DEFAULT_CATEGORY
    if (!map.has(name)) map.set(name, { name, count: 0, subs: new Map() })
    const item = map.get(name)
    item.count += 1
    const sub = doc.sub
    if (sub) item.subs.set(sub, (item.subs.get(sub) || 0) + 1)
  }
  return [...map.values()].map((item) => ({
    name: item.name,
    count: item.count,
    subs: [...item.subs.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  }))
}

/** 标签统计：[{ name, count }]，按使用次数倒序。 */
export function tagStats(docs) {
  const map = new Map()
  for (const doc of docs) {
    for (const tag of doc.tags || []) map.set(tag, (map.get(tag) || 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export class KbStore {
  #dir
  #file
  #docs = []
  #loaded = false
  #broken = null
  #mtime = 0
  #size = 0
  #queue = Promise.resolve()

  constructor(dir) {
    this.#dir = dir
    this.#file = join(dir, 'kb.json')
    this.#loadSync()
  }

  get dir() {
    return this.#dir
  }

  get file() {
    return this.#file
  }

  /** 同步快照：system prompt 每一轮都要用，不能 await。 */
  snapshot() {
    return this.#docs
  }

  #applyRaw(raw, stat) {
    const payload = JSON.parse(raw)
    if (payload?.format !== STORE_FORMAT) throw new Error(`未知的存储格式：${payload?.format}`)
    this.#docs = Array.isArray(payload.docs) ? payload.docs : []
    this.#mtime = stat ? stat.mtimeMs : 0
    this.#size = stat ? stat.size : 0
    this.#loaded = true
  }

  #loadSync() {
    try {
      const raw = readFileSync(this.#file, 'utf8')
      this.#applyRaw(raw, statSync(this.#file))
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.#docs = []
        this.#loaded = true
        return
      }
      // 文件坏了：先按空库启动，status() 会把错误报出来，别让整个插件起不来。
      this.#docs = []
      this.#loaded = true
      this.#broken = error.message
    }
  }

  /** 别的进程改过就重新载入。 */
  async #ensureFresh() {
    let stat = null
    try {
      stat = await fs.stat(this.#file)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (!stat) {
      if (this.#loaded && this.#docs.length) {
        this.#docs = []
        this.#mtime = 0
        this.#size = 0
      }
      return
    }
    if (this.#loaded && stat.mtimeMs === this.#mtime && stat.size === this.#size) return
    this.#applyRaw(await fs.readFile(this.#file, 'utf8'), stat)
  }

  async #persist(docs) {
    await fs.mkdir(this.#dir, { recursive: true })
    const payload = { format: STORE_FORMAT, updated_at: nowIso(), docs }
    const tmp = `${this.#file}.${randomBytes(4).toString('hex')}.tmp`
    await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8')
    try {
      await this.#replaceFile(tmp, this.#file)
    } catch (error) {
      await fs.unlink(tmp).catch(() => {})
      throw error
    }
    try {
      const stat = await fs.stat(this.#file)
      this.#mtime = stat.mtimeMs
      this.#size = stat.size
    } catch {
      // 拿不到 stat 不影响这次写入
    }
  }

  /** Windows 上目标文件正被别的进程读着时 rename 会 EPERM/EBUSY，重试几次即可。 */
  async #replaceFile(tmp, target) {
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(tmp, target)
        return
      } catch (error) {
        const retryable = ['EPERM', 'EACCES', 'EBUSY', 'EEXIST'].includes(error.code)
        if (!retryable || attempt >= 8) throw error
        await delay(20 + attempt * 25)
      }
    }
  }

  /** 同进程内串行化「读 → 改 → 写」。 */
  #serial(task) {
    const run = this.#queue.then(task, task)
    this.#queue = run.then(() => undefined, () => undefined)
    return run
  }

  async #mutate(apply) {
    return this.#serial(async () => {
      await this.#ensureFresh()
      const docs = this.#docs.map((doc) => ({ ...doc }))
      const result = await apply(docs)
      await this.#persist(docs)
      this.#docs = docs
      this.#loaded = true
      this.#broken = null
      return result
    })
  }

  async status() {
    try {
      await this.#ensureFresh()
      const docs = this.#docs
      return {
        ok: true,
        path: this.#file,
        dir: this.#dir,
        count: docs.length,
        categories: categoryStats(docs),
        tags: tagStats(docs),
        tree: CATEGORY_TREE,
        updated_at: docs.reduce((latest, doc) => (String(doc.updated_at) > latest ? String(doc.updated_at) : latest), ''),
      }
    } catch (error) {
      return {
        ok: false,
        path: this.#file,
        dir: this.#dir,
        error: error.message,
        count: 0,
        tree: CATEGORY_TREE,
        categories: [],
        tags: [],
      }
    }
  }

  async list({ category, sub, tags } = {}) {
    await this.#ensureFresh()
    const wanted = Array.isArray(tags) ? tags : []
    const items = this.#docs
      .filter((doc) => !category || category === 'all' || doc.category === category)
      .filter((doc) => !sub || doc.sub === sub)
      .filter((doc) => hasAllTags(doc, wanted))
      .slice()
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .map(docMeta)
    return { items, total: this.#docs.length }
  }

  /** 全文检索：标题、分类、二级分类、标签、摘要、正文，任一词不命中就淘汰。 */
  async search({ query, category, sub, tags } = {}) {
    await this.#ensureFresh()
    const tokens = tokenize(query)
    const wanted = Array.isArray(tags) ? tags : []
    const pool = this.#docs
      .filter((doc) => !category || category === 'all' || doc.category === category)
      .filter((doc) => !sub || doc.sub === sub)
      .filter((doc) => hasAllTags(doc, wanted))
    const scored = pool
      .map((doc) => ({ doc, score: scoreDoc(doc, tokens) }))
      .filter((item) => (tokens.length ? item.score > 0 : true))
      .sort((a, b) => (tokens.length ? b.score - a.score : String(b.doc.updated_at).localeCompare(String(a.doc.updated_at))))
    return {
      items: scored.map((item) => ({ ...docMeta(item.doc), score: item.score, snippet: snippetOf(item.doc, tokens) })),
      total: this.#docs.length,
      matched: scored.length,
      query: String(query || ''),
    }
  }

  async read(id) {
    await this.#ensureFresh()
    const doc = this.#docs.find((item) => item.id === id)
    if (!doc) throw new Error(`没有这篇文档：${id}`)
    return publicDoc(doc)
  }

  /** 新建或修改。带 id = 修改：只覆盖给出的字段，没给的保持原样，显式 null 才清空。 */
  async save(input, { source = 'ui' } = {}) {
    return this.#mutate((docs) => {
      const previous = input?.id ? docs.find((item) => item.id === input.id) : undefined
      if (input?.id && !previous) throw new Error(`没有这篇文档：${input.id}`)
      const doc = normalizeDoc(input, previous)
      if (previous) {
        const changed = diffFields(previous, doc)
        if (changed.length) {
          doc.history = [...(previous.history || []), { at: doc.updated_at, source, fields: changed }].slice(-HISTORY_LIMIT)
        }
        if (String(doc.updated_at) < String(previous.updated_at)) doc.updated_at = previous.updated_at
        const index = docs.findIndex((item) => item.id === doc.id)
        docs[index] = doc
      } else {
        docs.push(doc)
      }
      return publicDoc(doc)
    })
  }

  async update(id, patch = {}, options = {}) {
    if (!id) throw new Error('缺少 id')
    return this.save({ ...patch, id }, options)
  }

  async remove(id) {
    return this.#mutate((docs) => {
      const before = docs.length
      const left = docs.filter((doc) => doc.id !== id)
      if (left.length === before) throw new Error(`没有这篇文档：${id}`)
      docs.length = 0
      docs.push(...left)
      return { id, total: docs.length }
    })
  }
}
