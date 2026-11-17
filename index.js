// 知识库 · Host 半边
//
// 1. 存储（store.js）：文档落在一个 kb.json 里（默认 ~/.dsh-kb/data，可用 KB_STORE_DIR 覆盖），纯 JSON，全量常驻内存。
// 2. 给浏览器页面用的同源接口：POST /kb/api/rpc，action = status|list|search|get|save|update|delete。
//    知识库页面（client.js）和模型工具走同一套方法，不存在两份逻辑。
// 3. 给模型的五个工具：kb_search / kb_get / kb_save / kb_update / kb_delete。
// 4. 系统提示每轮注入：分类统计 + 已启用文档全文 + 条目索引，所以「启用」过的内容对话里自动带上。
import { fileURLToPath } from 'node:url'
import { CATEGORY_PRESETS, CATEGORY_TREE, KbStore, categoryStats, resolveStoreDir } from './store.js'

const PLUGIN_ROOT = fileURLToPath(new URL('.', import.meta.url))
const BASE = '/kb/api'
const MAX_BODY = 1024 * 1024

const PER_CATEGORY = 3

export const name = 'kb'
export const inject = ['webServer', 'tools']

const GUIDANCE = [
  '用户的 DSH 里有一个本机知识库（侧栏「知识库」可查看和编辑），用「一级主题 / 二级主题」分类，外加自由标签。',
  '- 需要流程、规范、注意事项或以前踩过的坑时，先用 kb_search 查（主题、命令、报错原文、标签、分类名都能搜），命中后用 kb_get 取正文；已经有记录的做法不要凭印象重写。',
  '- 用户说「记一下、存起来、整理成文档、归档」时，用 kb_save 写进知识库：category 填一级主题，sub 填二级主题，tags 填能帮以后找到它的关键词。',
]

function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return String(iso)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 「一级 / 二级」拼成一行的分类路径。 */
function pathOf(item) {
  return item.sub ? `${item.category} / ${item.sub}` : item.category
}

function sortedByUpdate(docs) {
  return docs.slice().sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
}

/**
 * 系统提示里的知识库段落。每轮对话现算：启用的文档给全文（有预算上限），
 * 其余给一行索引，让模型知道有哪些东西可以 kb_get。
 */
export function buildPrompt(docs) {
  const lines = ['# 知识库', ...GUIDANCE]
  if (!docs.length) {
    lines.push('', '知识库目前是空的。')
    return lines.join('\n')
  }
  const stats = categoryStats(docs)
    .filter((item) => item.count > 0)
    .map((item) => {
      const subs = item.subs.map((sub) => `${sub.name} ${sub.count}`).join('、')
      return subs ? `${item.name} ${item.count}（${subs}）` : `${item.name} ${item.count}`
    })
    .join(' · ')
  lines.push('', `当前共 ${docs.length} 篇：${stats}`)

  // 只给索引：每个一级主题一行、列几条标题，不带 id 和摘要；正文一律按需 kb_get。
  lines.push('', '## 已有文档（按主题，标题用 kb_search 精确取）')
  const grouped = new Map()
  for (const doc of sortedByUpdate(docs)) {
    if (!grouped.has(doc.category)) grouped.set(doc.category, [])
    grouped.get(doc.category).push(doc)
  }
  for (const [category, list] of grouped) {
    const titles = list.slice(0, PER_CATEGORY).map((doc) => doc.title)
    const more = list.length > PER_CATEGORY ? ` 等 ${list.length} 篇` : ''
    lines.push(`- ${category}：${titles.join('、')}${more}`)
  }
  return lines.join('\n')
}

function statusError(status, message) {
  return Object.assign(new Error(message), { status })
}

// 只接受同源页面发来的 JSON：content-type、Origin、自定义请求头三道，挡住跨站写入。
function readJson(req, max = MAX_BODY) {
  return new Promise((resolve, reject) => {
    if (req.method !== 'POST') return reject(statusError(405, '只接受 POST'))
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
      return reject(statusError(415, 'content-type 必须是 application/json'))
    }
    const origin = req.headers.origin
    if (origin) {
      let originHost = ''
      try {
        originHost = new URL(origin).host
      } catch {
        return reject(statusError(403, 'Origin 无效'))
      }
      if (!req.headers.host || originHost !== req.headers.host) return reject(statusError(403, '拒绝跨站请求'))
    }
    if (req.headers['x-kb'] !== '1') return reject(statusError(403, '缺少 x-kb 请求头'))
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > max) req.destroy()
      else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(statusError(400, '请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** 浏览器页面和工具共用的同一套操作。 */
async function dispatch(store, action, payload) {
  switch (action) {
    case 'status':
      return store.status()
    case 'list':
      return store.list({ category: payload.category, sub: payload.sub, tags: payload.tags })
    case 'search':
      return store.search({
        query: payload.query,
        category: payload.category,
        sub: payload.sub,
        tags: payload.tags,
        })
    case 'get':
      if (!payload.id) throw new Error('缺少 id')
      return store.read(String(payload.id))
    case 'save':
      return store.save(payload.entry || payload, { source: payload.source || 'ui' })
    case 'update':
      if (!payload.id) throw new Error('缺少 id')
      return store.update(String(payload.id), payload.patch || {}, { source: payload.source || 'ui' })
    case 'delete':
      if (!payload.id) throw new Error('缺少 id')
      return store.remove(String(payload.id))
    default:
      throw Object.assign(new Error(`未知操作：${action}`), { status: 400 })
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

const text = (value) => [{ type: 'text', text: value }]
const str = (description, extra = {}) => ({ type: 'string', description, ...extra })

function checkArgs(args, schema) {
  const errors = []
  const input = args && typeof args === 'object' ? args : {}
  for (const key of schema.required || []) {
    if (input[key] === undefined || input[key] === '') errors.push(`缺少 ${key}`)
  }
  for (const [key, value] of Object.entries(input)) {
    const property = schema.properties[key]
    if (!property) {
      errors.push(`未知参数 ${key}`)
      continue
    }
    if (value === undefined || value === null) continue
    if (property.type === 'array') {
      if (!Array.isArray(value)) errors.push(`${key} 应该是字符串数组`)
    } else if (property.type === 'boolean') {
      if (typeof value !== 'boolean') errors.push(`${key} 应该是 true 或 false`)
    } else if (typeof value !== 'string') {
      errors.push(`${key} 应该是字符串`)
    } else if (property.enum && !property.enum.includes(value)) {
      errors.push(`${key} 只能是 ${property.enum.join(' / ')}`)
    }
  }
  if (errors.length) throw new Error(errors.join('；'))
  return input
}

function metaLine(item) {
  const bits = [`【${pathOf(item)}】${item.title}`]
  if (item.summary) bits.push(item.summary)
  if (item.tags && item.tags.length) bits.push(`#${item.tags.slice(0, 4).join(' #')}`)
  bits.push(`${formatTime(item.updated_at)}`)
  bits.push(item.id)
  return bits.join(' · ')
}

function docText(doc) {
  const lines = [`【${pathOf(doc)}】${doc.title}`, `id：${doc.id}`]
  if (doc.summary) lines.push(`摘要：${doc.summary}`)
  if (doc.tags && doc.tags.length) lines.push(`标签：${doc.tags.join('、')}`)
  lines.push(`更新：${formatTime(doc.updated_at)}（${doc.body_length} 字）`)
  if (doc.body) lines.push('', doc.body)
  const history = (doc.history || []).slice(-3).reverse()
  if (history.length) {
    lines.push('', '修改记录：')
    for (const item of history) {
      lines.push(`- ${formatTime(item.at)} 改了 ${item.fields.join('、')}（${item.source === 'tool' ? '对话' : '页面'}）`)
    }
  }
  return lines.join('\n')
}

function buildTools(store) {
  const treeHint = CATEGORY_TREE.map((item) => `${item.name}（${item.subs.join('、')}）`).join('；')

  const SAVE_PARAMS = {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: str('标题，例如「记易安卓打包发版流程」「COS 签名 URL 报 403 的排查」'),
      category: str(`一级主题。预置树：${treeHint}；也可以用自定义一级主题`),
      sub: str('二级主题，写在该一级下面，例如 category=Git 与代码托管 时 sub=Gitee / GitHub 连接'),
      summary: str('一句话摘要（进索引和列表，方便以后找到）'),
      body: str('正文，支持 Markdown：步骤、命令、注意事项、报错原文都可以直接写'),
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '标签，用来横向串联和筛选，例如 ["git", "gitee", "ssh", "tailscale"]',
      },
      id: str('要更新的文档 id；不填表示新建'),
    },
  }

  const UPDATE_PARAMS = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: {
      id: str('要修改的文档 id（kb_search 返回）'),
      title: str('新标题'),
      category: str('新一级主题'),
      sub: str('新二级主题'),
      summary: str('新摘要'),
      body: str('新正文（整体替换）'),
      tags: { type: 'array', items: { type: 'string' }, description: '新的标签列表（整体替换）' },
      clear: {
        type: 'array',
        items: { type: 'string', enum: ['sub', 'summary', 'body', 'tags'] },
        description: '要清空的字段',
      },
    },
  }

  const SEARCH_PARAMS = {
    type: 'object',
    additionalProperties: false,
    properties: {
      query: str('关键词，空格分开表示都要命中；可以是主题、命令、报错原文或标签。留空则列出全部'),
      category: str('只看某个一级主题'),
      sub: str('只看某个二级主题'),
      tags: { type: 'array', items: { type: 'string' }, description: '按标签筛，多个标签要同时命中' },
    },
  }

  const GET_PARAMS = {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: str('文档 id（kb_search 返回）'),
      query: str('不确定 id 时用标题关键词查；命中多篇会返回候选列表'),
    },
  }

  const DELETE_PARAMS = {
    type: 'object',
    additionalProperties: false,
    required: ['id'],
    properties: { id: str('要删除的文档 id') },
  }

  return [
    {
      name: 'kb_search',
      description:
        `在本机知识库里搜索${CATEGORY_PRESETS.join('、')}等主题（标题、一级/二级分类、标签、摘要、正文都搜）。返回命中条目和 id；要正文就用 kb_get 取，列出全部就不传 query。`,
      parameters: SEARCH_PARAMS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['matched', 'total', 'summary'],
          properties: {
            matched: { type: 'integer' },
            total: { type: 'integer' },
            summary: { type: 'string' },
          },
        },
        render: (_args, value) => text(value.summary),
      },
      async execute(rawArgs) {
        const args = checkArgs(rawArgs, SEARCH_PARAMS)
        const result = await dispatch(store, 'search', {
          query: args.query,
          category: args.category,
          sub: args.sub,
          tags: args.tags,
        })
        const shown = result.items.slice(0, 30)
        const filterBits = [args.category, args.sub].filter(Boolean).join(' / ')
        const tagBits = args.tags && args.tags.length ? ` #${args.tags.join(' #')}` : ''
        const scope = [filterBits, tagBits].filter(Boolean).join(' ')
        const header = args.query
          ? `「${args.query}」${scope ? `（${scope}）` : ''}命中 ${result.matched} 篇（全库 ${result.total} 篇）`
          : `${scope ? `（${scope}）` : ''}共 ${result.matched} 篇（全库 ${result.total} 篇）`
        const rows = shown.map((item, index) => {
          const line = `${index + 1}. ${metaLine(item)}`
          return item.snippet && args.query ? `${line}\n   ${item.snippet}` : line
        })
        const tail = result.items.length > shown.length ? `（只显示前 ${shown.length} 篇，用 query 缩小范围）` : ''
        const empty = !result.items.length ? (args.query ? '没有匹配的条目。' : '知识库还是空的。') : ''
        const summary = [header, ...rows, tail, empty].filter(Boolean).join('\n')
        return { matched: result.matched, total: result.total, summary }
      },
    },
    {
      name: 'kb_get',
      description: '取一篇知识库文档的正文。用 id 精确取；只给 query 时按关键词找，命中一篇就直接返回正文。',
      parameters: GET_PARAMS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['found', 'text'],
          properties: {
            found: { type: 'boolean' },
            text: { type: 'string' },
          },
        },
        render: (_args, value) => text(value.text),
      },
      async execute(rawArgs) {
        const args = checkArgs(rawArgs, GET_PARAMS)
        if (args.id) {
          const doc = await dispatch(store, 'get', { id: args.id })
          return { found: true, text: docText(doc) }
        }
        if (!args.query) throw new Error('需要 id 或 query')
        const result = await dispatch(store, 'search', { query: args.query })
        if (!result.items.length) return { found: false, text: `没有匹配「${args.query}」的文档。` }
        if (result.items.length === 1) {
          const doc = await dispatch(store, 'get', { id: result.items[0].id })
          return { found: true, text: docText(doc) }
        }
        const rows = result.items.slice(0, 10).map((item, index) => `${index + 1}. 【${pathOf(item)}】${item.title} · ${item.id}`)
        return {
          found: false,
          text: `「${args.query}」命中 ${result.items.length} 篇，选一个 id 再取：\n${rows.join('\n')}`,
        }
      },
    },
    {
      name: 'kb_save',
      description:
        '把一篇文档存进本机知识库（侧栏「知识库」可以看）。不传 id 是新建；带 id 就是修改——只覆盖你给出的字段，没给的保持不变。只想改一两个字段时优先用 kb_update。',
      parameters: SAVE_PARAMS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'title', 'path', 'created'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            path: { type: 'string' },
            created: { type: 'boolean' },
          },
        },
        render: (_args, value) =>
          text(
            `已${value.created ? '存入' : '更新'}：${value.title}（${value.path}，id ${value.id}）`,
          ),
      },
      async execute(rawArgs) {
        const args = checkArgs(rawArgs, SAVE_PARAMS)
        const created = !args.id
        const doc = await dispatch(store, 'save', {
          source: 'tool',
          entry: {
            id: args.id,
            title: args.title,
            category: args.category,
            sub: args.sub,
            summary: args.summary,
            body: args.body,
            tags: args.tags,
          },
        })
        return { id: doc.id, title: doc.title, path: pathOf(doc), created }
      },
    },
    {
      name: 'kb_update',
      description:
        '改一篇已有文档：只传要改的字段，其余一律保持不变；要清空某字段就把字段名放进 clear。改完记一条修改记录（只记改了哪些字段）。',
      parameters: UPDATE_PARAMS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'title', 'changed'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            changed: { type: 'array', items: { type: 'string' } },
          },
        },
        render: (_args, value) =>
          text(`已修改：${value.title}（${value.changed.length ? `改了 ${value.changed.join('、')}` : '内容和原来一样'}）。`),
      },
      async execute(rawArgs) {
        const args = checkArgs(rawArgs, UPDATE_PARAMS)
        const patch = {}
        for (const key of ['title', 'category', 'sub', 'summary', 'body', 'tags']) {
          if (args[key] !== undefined) patch[key] = args[key]
        }
        for (const key of args.clear || []) patch[key] = null
        if (!Object.keys(patch).length) throw new Error('没有要改的字段：给 title/category/sub/summary/body/tags 之一，或用 clear 清空。')
        const doc = await dispatch(store, 'update', { id: args.id, patch, source: 'tool' })
        const last = (doc.history || []).slice(-1)[0]
        return { id: doc.id, title: doc.title, changed: last ? last.fields : [] }
      },
    },
    {
      name: 'kb_delete',
      description: '从知识库删除一篇文档。删之前先跟用户确认是哪一篇。',
      parameters: DELETE_PARAMS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'total'],
          properties: { id: { type: 'string' }, total: { type: 'integer' } },
        },
        render: (_args, value) => text(`已删除 ${value.id}，知识库还剩 ${value.total} 篇。`),
      },
      async execute(rawArgs) {
        const args = checkArgs(rawArgs, DELETE_PARAMS)
        return dispatch(store, 'delete', { id: args.id })
      },
    },
  ]
}

export function apply(ctx) {
  const store = new KbStore(resolveStoreDir(PLUGIN_ROOT))

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: BASE,
      async handler(req, res) {
        if (req.method !== 'POST') {
          res.writeHead(405, { allow: 'POST' })
          res.end()
          return
        }
        try {
          const body = await readJson(req)
          const data = await dispatch(store, String(body.action || ''), body)
          sendJson(res, 200, { ok: true, data })
        } catch (error) {
          sendJson(res, error.status || 500, { ok: false, error: error.message })
        }
      },
    }),
  )

  for (const tool of buildTools(store)) ctx.effect(() => ctx.tools.register(tool))

  const systemPrompt = ctx.get('systemPrompt')
  if (systemPrompt) {
    // 文本函数每轮现算：页面上刚改完的内容，下一轮对话就是新的。
    ctx.effect(() =>
      systemPrompt.section({
        name: 'kb-knowledge-base',
        order: 41,
        text: () => buildPrompt(store.snapshot()),
      }),
    )
  }
}
