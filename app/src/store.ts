// localStorage 进度存储：全站唯一持久化入口（仅 lane4 可增量扩展，不得破坏现有导出）。

export interface Checkin {
  am?: boolean
  pm?: boolean
}

export interface WrongWord {
  word: string
  kk: string
  count: number
  lastSeen: number
  mastered?: boolean
}

export interface QuizRound {
  date: number
  score: number
  total: number
}

export interface Progress {
  seenLetters: string[]
  quizRounds: QuizRound[]
  wrong: Record<string, WrongWord>
  checkins: Record<string, Checkin> // key = YYYY-MM-DD
}

const KEY = 'kk-phonics-progress-v1'

function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function loadProgress(): Progress {
  const empty: Progress = { seenLetters: [], quizRounds: [], wrong: {}, checkins: {} }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    return { ...empty, ...(JSON.parse(raw) as Partial<Progress>) }
  } catch {
    return empty
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // 存储不可用时静默忽略
  }
}

export function addSeenLetter(letter: string) {
  const p = loadProgress()
  if (!p.seenLetters.includes(letter)) {
    p.seenLetters.push(letter)
    save(p)
  }
}

export function recordQuizRound(score: number, total: number) {
  const p = loadProgress()
  p.quizRounds.push({ date: Date.now(), score, total })
  save(p)
}

export function addWrongWord(word: string, kk: string) {
  const p = loadProgress()
  const cur = p.wrong[word] ?? { word, kk, count: 0, lastSeen: 0 }
  cur.count += 1
  cur.lastSeen = Date.now()
  cur.mastered = false
  p.wrong[word] = cur
  save(p)
}

export function markWrongMastered(word: string) {
  const p = loadProgress()
  if (p.wrong[word]) {
    p.wrong[word].mastered = true
    save(p)
  }
}

export function toggleCheckin(slot: 'am' | 'pm'): boolean {
  const p = loadProgress()
  const key = todayKey()
  const day = p.checkins[key] ?? {}
  day[slot] = !day[slot]
  p.checkins[key] = day
  save(p)
  return !!day[slot]
}

export function todayCheckin(): Checkin {
  return loadProgress().checkins[todayKey()] ?? {}
}

/** 最近 n 天打卡情况，返回 [{date:'MM-DD', am, pm}]，旧 → 新 */
export function recentCheckins(n = 14) {
  const p = loadProgress()
  const out: { date: string; am: boolean; pm: boolean }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const c = p.checkins[todayKey(d)] ?? {}
    out.push({ date: todayKey(d).slice(5), am: !!c.am, pm: !!c.pm })
  }
  return out
}

/** 连续打卡天数（以任一 slot 打卡计；今天未打卡不打断连续） */
export function streakDays(): number {
  const p = loadProgress()
  let n = 0
  const d = new Date()
  const t = p.checkins[todayKey(d)]
  if (!(t?.am || t?.pm)) d.setDate(d.getDate() - 1)
  for (;;) {
    const c = p.checkins[todayKey(d)]
    if (c?.am || c?.pm) {
      n += 1
      d.setDate(d.getDate() - 1)
    } else break
  }
  return n
}
