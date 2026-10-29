// 测验引擎（lane3 所有）：三种题型生成器 + 每轮组卷 + 每日一测的轻量记录。
// 数据从 src/data/*.json 读取（契约见 src/types.ts，lane1 增字段时此处用断言容错）。
import wordsData from '../data/words.json'
import type { Word } from '../types'

const WORDS = wordsData as unknown as Word[]

export type QuizKind = 'seeKk' | 'hearWord' | 'judgeRule'
export type QuizType = QuizKind | 'mixed'

/** 题型中文名（练习页展示用） */
export const KIND_LABEL: Record<QuizKind, string> = {
  seeKk: '看词选音标',
  hearWord: '听音选词',
  judgeRule: '判断规则',
}

/** 规则短标签（判断规则题的选项文案） */
export const RULE_SHORT: Record<string, string> = {
  rule1: '词尾 e 不发音',
  rule2: '元音 + r',
  rule3: 'oo 相连',
  rule4: 'au / ou / aw / ow',
  rule5: '常见辅音组合',
  none: '都不属于这五条规则',
}

export function ruleLabel(rule: string): string {
  return RULE_SHORT[rule] ?? rule
}

export interface QuizQuestion {
  kind: QuizKind
  word: string // 目标词（hearWord 在答题前不应展示给用户）
  kk: string // 目标词音标
  rule: string // 'rule1'..'rule5' 或 'none'
  options: string[] // seeKk: 音标；hearWord: 单词；judgeRule: 规则短标签
  answerIndex: number
}

export interface RoundOptions {
  type?: QuizType // 默认 mixed
  count?: number // 默认 10
  levels?: Array<1 | 2 | 3> // 只从这些 level 抽词；缺省为全部
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

/** 粗略提取主要元音串，用于找「发音相近」的干扰词 */
function vowelCore(kk: string): string {
  const s = kk.replace(/[\/ˈˌː]/g, '')
  const m = s.match(/[aeiouɛɪʊɔʌæɝɚə]+/g)
  return m ? m.join('') : ''
}

/**
 * 干扰词池：同规则 > 同元音（相近音标）> 其他，排除目标词本身。
 * options 排除 exclude（通常是已用过的目标词），保证选项之间不冲突。
 */
function similarWords(target: Word, pool: Word[], exclude: Set<string>): Word[] {
  const cand = pool.filter(
    (w) => w.word !== target.word && !exclude.has(w.word) && w.kk !== target.kk,
  )
  const sameRule = shuffle(cand.filter((w) => w.rule === target.rule))
  const sameVowel = shuffle(
    cand.filter(
      (w) => w.rule !== target.rule && vowelCore(w.kk) === vowelCore(target.kk),
    ),
  )
  const rest = shuffle(
    cand.filter((w) => !sameRule.includes(w) && !sameVowel.includes(w)),
  )
  return [...sameRule, ...sameVowel, ...rest]
}

/** (a) 看词选音标：给出单词，选正确 KK 音标 */
function makeSeeKk(target: Word, pool: Word[], used: Set<string>): QuizQuestion {
  const sims = similarWords(target, pool, used)
  let ds = dedupe(sims.map((w) => w.kk)).slice(0, 3)
  if (ds.length < 3) {
    for (const w of shuffle(WORDS)) {
      if (w.kk !== target.kk && !ds.includes(w.kk)) {
        ds.push(w.kk)
        if (ds.length === 3) break
      }
    }
  }
  const options = shuffle([target.kk, ...ds])
  return {
    kind: 'seeKk',
    word: target.word,
    kk: target.kk,
    rule: target.rule,
    options,
    answerIndex: options.indexOf(target.kk),
  }
}

/** (b) 听音选词：TTS 播放发音，选出听到的单词 */
function makeHearWord(target: Word, pool: Word[], used: Set<string>): QuizQuestion {
  const sims = similarWords(target, pool, used)
  let ds = dedupe(sims.map((w) => w.word)).slice(0, 3)
  if (ds.length < 3) {
    for (const w of shuffle(WORDS)) {
      if (w.word !== target.word && !ds.includes(w.word)) {
        ds.push(w.word)
        if (ds.length === 3) break
      }
    }
  }
  const options = shuffle([target.word, ...ds])
  return {
    kind: 'hearWord',
    word: target.word,
    kk: target.kk,
    rule: target.rule,
    options,
    answerIndex: options.indexOf(target.word),
  }
}

/** (c) 判断规则：这个词用到了哪条规则（选项固定含 none） */
function makeJudgeRule(target: Word): QuizQuestion {
  const allRules = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5']
  let chosen: string[]
  if (target.rule === 'none') {
    chosen = ['none', ...shuffle(allRules).slice(0, 3)]
  } else {
    chosen = [
      target.rule,
      'none',
      ...shuffle(allRules.filter((r) => r !== target.rule)).slice(0, 2),
    ]
  }
  const options = shuffle(chosen.map(ruleLabel))
  return {
    kind: 'judgeRule',
    word: target.word,
    kk: target.kk,
    rule: target.rule,
    options,
    answerIndex: options.indexOf(ruleLabel(target.rule)),
  }
}

/** 生成一轮题目：默认混合题型 10 题 */
export function generateRound(opts: RoundOptions = {}): QuizQuestion[] {
  const { type = 'mixed', count = 10, levels } = opts
  const pool = levels?.length ? WORDS.filter((w) => levels.includes(w.level)) : WORDS
  const usable = pool.length ? pool : WORDS
  if (!usable.length) return []

  // 选题：池子够大就不重复，不够时循环复用
  const bag = shuffle(usable)
  const kinds: QuizKind[] = ['seeKk', 'hearWord', 'judgeRule']
  const kindSeq = shuffle(
    Array.from({ length: count }, (_, i) => (type === 'mixed' ? kinds[i % 3] : type)),
  )

  const used = new Set<string>()
  const out: QuizQuestion[] = []
  for (let i = 0; i < count; i++) {
    let target = bag[i % bag.length]
    if (used.has(target.word)) {
      const alt = bag.find((w) => !used.has(w.word))
      if (!alt) break
      target = alt
    }
    used.add(target.word)
    const kind = kindSeq[i]
    if (kind === 'seeKk') out.push(makeSeeKk(target, usable, used))
    else if (kind === 'hearWord') out.push(makeHearWord(target, usable, used))
    else out.push(makeJudgeRule(target))
  }
  return out
}

// —— 每日一测的轻量记录 ——
// store.ts 归 lane4 所有（现有导出契约不可动），这里用独立 localStorage key
// 记录「今日一测」的完成日期与成绩，键名隔离，不影响 store 的进度数据。

const DAILY_KEY = 'kk-phonics-daily-v1'

export interface DailyRecord {
  date: string // YYYY-MM-DD
  score: number
  total: number
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function readDaily(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    const list = raw ? (JSON.parse(raw) as DailyRecord[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeDaily(list: DailyRecord[]) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(list))
  } catch {
    // 存储不可用时静默忽略
  }
}

/** 今天（或指定日期）的每日一测是否已完成 */
export function isDailyDone(date = todayKey()): boolean {
  return readDaily().some((r) => r.date === date)
}

/** 记录（或覆盖）某天的每日一测成绩 */
export function saveDailyResult(date: string, score: number, total: number) {
  const list = readDaily().filter((r) => r.date !== date)
  list.push({ date, score, total })
  list.sort((a, b) => (a.date < b.date ? -1 : 1))
  writeDaily(list)
}

/** 每日一测历史（旧 → 新） */
export function dailyHistory(): DailyRecord[] {
  return readDaily()
}
