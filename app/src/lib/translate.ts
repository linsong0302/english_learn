// 免费翻译服务封装（lane8 所有）：MyMemory 接口，无需任何密钥。
// 说明：这是免费公共服务，中国网络环境下可能连不上——所有失败都抛错给调用方，
// 由界面显示友好提示，绝不阻塞阅读。翻译结果按原文缓存（localStorage），同句不重复请求。

const CACHE_KEY = 'kk-translate-cache-v1'
const CACHE_MAX = 200
const CHUNK_LIMIT = 450 // MyMemory 单次请求文本上限约 500 字节
const TIMEOUT_MS = 8000

let memoryCache: Map<string, string> | null = null

function loadCache(): Map<string, string> {
  if (memoryCache) return memoryCache
  memoryCache = new Map()
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    for (const k of Object.keys(obj)) memoryCache.set(k, obj[k])
  } catch {
    // 存储不可用则仅用内存缓存
  }
  return memoryCache
}

function saveCache(cache: Map<string, string>) {
  try {
    const obj: Record<string, string> = {}
    let n = 0
    for (const [k, v] of cache) {
      if (n++ >= CACHE_MAX) break
      obj[k] = v
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj))
  } catch {
    // 忽略
  }
}

/** 把长文本切成 ≤limit 的块（尽量在句号处断开） */
function splitChunks(text: string, limit: number): string[] {
  if (text.length <= limit) return [text]
  const chunks: string[] = []
  let rest = text
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('. ', limit)
    if (cut < limit * 0.4) cut = limit
    chunks.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

async function translateOne(text: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`,
      { signal: ctrl.signal },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } }
    const out = data.responseData?.translatedText
    if (typeof out !== 'string' || !out.trim()) throw new Error('翻译结果为空')
    return out
  } finally {
    clearTimeout(timer)
  }
}

/** 英译中：自动分段、带缓存；失败抛错（调用方负责提示） */
export async function translateToChinese(text: string): Promise<string> {
  const key = text.replace(/\s+/g, ' ').trim()
  if (!key) return ''
  const cache = loadCache()
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const chunks = splitChunks(key, CHUNK_LIMIT)
  const parts: string[] = []
  for (const c of chunks) parts.push(await translateOne(c))
  const full = parts.join('\n')
  cache.set(key, full)
  if (cache.size > CACHE_MAX) {
    // 简单淘汰：删掉最早写入的一半
    let n = 0
    for (const k of cache.keys()) {
      if (n++ < CACHE_MAX / 2) cache.delete(k)
      else break
    }
  }
  saveCache(cache)
  return full
}
