// 在线文章抓取（lane8）：通过 r.jina.ai 免费代理把任意文章网址转成 markdown 文本。
// 说明：浏览器直接抓 BBC 等站点会被 CORS 拦截，r.jina.ai 是免费的网页转文本代理
// （无需密钥，有每分钟约 20 次的限流），支持 Access-Control-Allow-Origin。
// 中国网络环境下可能连不上——失败抛错，由界面提示改用「复制粘贴」。

const TIMEOUT_MS = 15000

/** 从抓取结果提取标题与正文（兼容 r.jina.ai 的 Title:/Markdown Content: 头部格式） */
function extractTitle(md: string): { title?: string; body: string } {
  const hash = md.match(/^#\s+(.+)$/m)
  if (hash) return { title: hash[1].trim(), body: md.replace(hash[0], '') }
  const meta = md.match(/^Title:\s*(.+)$/m)
  let body = md
  const contentMark = md.match(/^Markdown Content:\s*$/m)
  if (contentMark && contentMark.index !== undefined) {
    body = md.slice(contentMark.index + contentMark[0].length)
  }
  return { title: meta?.[1]?.trim(), body }
}

/** 把抓来的 markdown 清洗成适合学习的纯英文正文：去图片/链接/代码块/引用标记 */
function cleanMarkdown(md: string): string {
  const cleaned = md
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接只留文字
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // 其余标题符
    .replace(/^\s{0,3}>\s?/gm, '') // 引用符
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 粗体
    .replace(/\*([^*]+)\*/g, '$1') // 斜体
    .replace(/`([^`]+)`/g, '$1') // 行内代码
    .replace(/^\s*[-*]\s+/gm, '') // 列表符
    .replace(/\r/g, '')
  // 只保留「像文章段落」的块：去掉导航碎句（Skip to content、单按钮文字等）
  const blocks = cleaned
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\n+/g, ' ').trim())
    .filter((b) => b.replace(/[^A-Za-z]/g, '').length >= 60 && /[.!?]["')\]]?\s*$|[.!?]["')\]]\s/.test(b))
  return blocks.join('\n\n').trim()
}

/** 抓取一篇文章：返回 { title, text }；失败抛错（调用方提示降级） */
export async function fetchArticleFromUrl(url: string): Promise<{ title: string; text: string }> {
  let u = url.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  // 简单合法性检查
  try {
    new URL(u)
  } catch {
    throw new Error('网址格式不对')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://r.jina.ai/${u}`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`抓取失败（HTTP ${res.status}）`)
    const md = await res.text()
    if (!md.trim()) throw new Error('页面内容为空')
    const { title, body } = extractTitle(md)
    const text = cleanMarkdown(body)
    if (text.replace(/\s/g, '').length < 120) throw new Error('没有抓到足够的正文')
    return { title: title?.slice(0, 60) || '网页文章', text }
  } finally {
    clearTimeout(timer)
  }
}
