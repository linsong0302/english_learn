// 相似度打分（lane6 所有）：跟读识别文本 vs 目标词的匹配度计算。
// 纯函数、零依赖；不碰识别，也不碰存储。

/** 规范化：小写、去标点（保留撇号连字）、压缩空格、去首尾空白 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Levenshtein 编辑距离（滚动一行，O(min) 空间） */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  // 让 b 作为短的一行，省内存
  if (a.length < b.length) {
    const t = a
    a = b
    b = t
  }
  let prev = new Array<number>(b.length + 1)
  let curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const t = prev
    prev = curr
    curr = t
  }
  return prev[b.length]
}

/** 相似度 0-1：1 = 完全一致，0 = 完全不同。空串对空串视为 1 */
export function similarity(a: string, b: string): number {
  const x = normalize(a)
  const y = normalize(b)
  if (!x && !y) return 1
  if (!x || !y) return 0
  if (x === y) return 1
  const maxLen = Math.max(x.length, y.length)
  return 1 - levenshtein(x, y) / maxLen
}

/**
 * 单条识别文本 vs 目标词的打分：
 * 取「整句比对」与「逐词比对取最高」的较大值。
 * 这样孩子多说一句 "the word is cat" 也能按 cat 给分，不会冤枉。
 */
export function scoreUtterance(target: string, text: string): number {
  const whole = similarity(target, text)
  const tokens = normalize(text).split(' ').filter(Boolean)
  let bestToken = 0
  for (const t of tokens) {
    const s = similarity(target, t)
    if (s > bestToken) bestToken = s
  }
  return Math.max(whole, bestToken)
}

export interface MatchResult {
  /** 最高得分 0-1 */
  score: number
  /** 得到最高分的那条候选原文 */
  text: string
}

/** 多候选打分：alternatives 里逐条比，取最高分（识别结果的 maxAlternatives 备选用） */
export function bestMatch(alternatives: string[], target: string): MatchResult {
  let score = 0
  let text = ''
  for (const alt of alternatives) {
    if (!alt) continue
    const s = scoreUtterance(target, alt)
    if (s > score) {
      score = s
      text = alt
    }
  }
  return { score, text }
}
