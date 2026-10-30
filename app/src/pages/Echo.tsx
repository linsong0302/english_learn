// 跟读打分页（lane6 所有）：听示范 → 对着麦克风读 → 识别打分（⭐ 评级）→ 一轮结算。
// 识别走 hooks/useSpeechRecognition，示范发音走 hooks/useSpeech，打分走 lib/similarity。
import { useEffect, useRef, useState } from 'react'
import wordsData from '../data/words.json'
import type { Word } from '../types'
import { speakWord, stopSpeaking, unlockSpeech } from '../hooks/useSpeech'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { bestMatch } from '../lib/similarity'
import './echo.css'

const ALL_WORDS = wordsData as unknown as Word[]
const ROUND_COUNT = 10

// level：0 = 全部，1-3 对应词库难度
const LEVEL_OPTS = [
  { key: 0, label: '全部' },
  { key: 1, label: '一级' },
  { key: 2, label: '二级' },
  { key: 3, label: '三级' },
]

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** 相似度 → 星级：≥0.9 三星，≥0.6 两星，其余一星 */
function starOf(score: number): number {
  if (score >= 0.9) return 3
  if (score >= 0.6) return 2
  return 1
}

const STAR_MSG: Record<number, string> = {
  3: '太棒了！读得真标准！',
  2: '不错，再来一次更准',
  1: '再听一遍示范，慢慢来',
}

function starsText(n: number): string {
  return '⭐'.repeat(n) + '☆'.repeat(3 - n)
}

// —— 跟读统计与收藏（独立 localStorage key，不使用 store.ts）——

const STATS_KEY = 'kk-echo-stats' // { 'YYYY-MM-DD': { count, starSum } }
const FAVS_KEY = 'kk-echo-favs' // string[]：收藏的单词

interface EchoDayStat {
  count: number
  starSum: number
}

function echoTodayKey(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function loadEchoStats(): Record<string, EchoDayStat> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, EchoDayStat>) : {}
  } catch {
    return {}
  }
}

/** 记一次跟读结果（星级 1-3） */
function addEchoStars(stars: number) {
  try {
    const all = loadEchoStats()
    const k = echoTodayKey()
    const day = all[k] ?? { count: 0, starSum: 0 }
    day.count += 1
    day.starSum += stars
    all[k] = day
    localStorage.setItem(STATS_KEY, JSON.stringify(all))
  } catch {
    // 存储不可用（如隐私模式）时静默跳过，不影响练习
  }
}

function loadEchoFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAVS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function saveEchoFavs(favs: string[]) {
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify(favs))
  } catch {
    // 忽略
  }
}

type Phase = 'pick' | 'play' | 'result'

export default function Echo({ onClose }: { onClose: () => void }) {
  const rec = useSpeechRecognition()
  const { listening, result, error, start, stop, reset } = rec

  const [phase, setPhase] = useState<Phase>('pick')
  const [level, setLevel] = useState(0)
  const [roundWords, setRoundWords] = useState<Word[]>([])
  const [results, setResults] = useState<(number | null)[]>([])
  const [index, setIndex] = useState(0)
  const [cur, setCur] = useState<{ score: number; text: string } | null>(null)
  const scoredRef = useRef(-1) // 当前词是否已打过分（防重复计分）

  // 跟读统计与收藏
  const [todayStat, setTodayStat] = useState<EchoDayStat>(
    () => loadEchoStats()[echoTodayKey()] ?? { count: 0, starSum: 0 },
  )
  const [favs, setFavs] = useState<string[]>(() => loadEchoFavs())
  const [preferFavs, setPreferFavs] = useState(false)

  const word = roundWords[index]
  const done = index + 1 >= roundWords.length

  // —— 组卷：按难度筛选后随机抽 10 词（words 参数用于「错词重练」）——
  // 开启「优先练收藏」时：收藏词排前面，不足 10 个再用当前难度的词补齐
  function startRound(words?: Word[]) {
    let pool: Word[]
    if (words) {
      pool = words
    } else if (preferFavs && favs.length) {
      const favPool = ALL_WORDS.filter((w) => favs.includes(w.word))
      const rest = ALL_WORDS.filter(
        (w) => (level === 0 || w.level === level) && !favs.includes(w.word),
      )
      pool = [...shuffle(favPool), ...shuffle(rest)]
    } else {
      pool = ALL_WORDS.filter((w) => level === 0 || w.level === level)
    }
    const picked = shuffle(pool).slice(0, ROUND_COUNT)
    if (!picked.length) return
    setRoundWords(picked)
    setResults(picked.map(() => null))
    setIndex(0)
    setCur(null)
    scoredRef.current = -1
    reset()
    setPhase('play')
  }

  // 每进入一个新词，自动播一遍示范
  useEffect(() => {
    if (phase === 'play' && roundWords[index]) {
      speakWord(roundWords[index].word)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  // 离开页面时停掉可能的朗读
  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  // 识别出最终结果 → 打分（每个词只记一次分，重试后重新记）
  useEffect(() => {
    if (phase !== 'play' || !result || !result.final) return
    if (scoredRef.current === index) return
    const target = roundWords[index]
    if (!target) return
    scoredRef.current = index
    const m = bestMatch(result.alternatives, target.word)
    const score = m.score
    const stars = starOf(score)
    setCur({ score, text: m.text })
    setResults((rs) => {
      const next = [...rs]
      next[index] = score
      return next
    })
    // 记入今日统计（独立 localStorage key）
    addEchoStars(stars)
    setTodayStat((t) => ({ count: t.count + 1, starSum: t.starSum + stars }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, phase, index])

  function toggleMic() {
    if (listening) {
      stop()
    } else {
      setCur(null)
      scoredRef.current = -1
      stopSpeaking() // 别让示范朗读被麦克风听到
      start()
    }
  }

  function retry() {
    setCur(null)
    scoredRef.current = -1
    stopSpeaking()
    start()
  }

  function toggleFav(w: string) {
    setFavs((f) => {
      const next = f.includes(w) ? f.filter((x) => x !== w) : [...f, w]
      saveEchoFavs(next)
      return next
    })
  }

  function next() {
    if (done) {
      setPhase('result')
    } else {
      setIndex((i) => i + 1)
      setCur(null)
      scoredRef.current = -1
      reset()
    }
  }

  // —— 降级：当前浏览器不支持语音识别 ——
  if (!rec.supported) {
    return (
      <div className="extra-page">
        <header className="extra-header">
          <button className="extra-back" onClick={onClose}>← 返回</button>
          <b>跟读打分</b>
        </header>
        <div className="card echo-fallback">
          <p className="echo-fb-emoji">🎤💤</p>
          <p className="card-title">当前浏览器不支持语音识别</p>
          <p className="card-hint">
            换用 Chrome 或 Edge 浏览器打开，就能玩「听示范 → 跟着读 → 打分」啦。
          </p>
          <p className="card-hint">
            现在可以先点「返回」，去底部「口诀」页点开字母卡片，听示范音跟着一起读，效果一样好！
          </p>
        </div>
      </div>
    )
  }

  // —— 选词 ——
  if (phase === 'pick') {
    const avgStars = todayStat.count ? todayStat.starSum / todayStat.count : 0
    return (
      <div className="page">
        <h1>跟读打分</h1>
        <p className="page-sub">听示范 → 跟着读 → 看看你读得像不像！</p>

        <div className="card echo-stats">
          {todayStat.count > 0 ? (
            <>
              <p className="echo-stats-line">
                今天已经跟读 <b>{todayStat.count}</b> 个词
              </p>
              <p className="echo-stats-line">
                平均 <b>{avgStars.toFixed(1)}</b> 星 {starsText(Math.min(3, Math.max(1, Math.round(avgStars))))}
              </p>
            </>
          ) : (
            <p className="echo-stats-line">今天还没跟读过，先来一轮热热身吧！💪</p>
          )}
        </div>

        <div className="card">
          <p className="card-title">选择练习的词</p>
          <div className="seg echo-levels">
            {LEVEL_OPTS.map((o) => (
              <button key={o.key} className={level === o.key ? 'on' : ''} onClick={() => setLevel(o.key)}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="card-hint">
            一级最简单，三级稍难一点。每轮随机 {ROUND_COUNT} 个词，读完出结算。
          </p>
          <button
            className={'echo-pref' + (preferFavs ? ' on' : '')}
            disabled={!favs.length}
            onClick={() => setPreferFavs((v) => !v)}
          >
            {preferFavs ? '✅ 优先练收藏的词：已开启' : '⭐ 优先练收藏的词'}
            （已收藏 {favs.length} 个）
          </button>
          <button
            className="btn btn-warm btn-block echo-start"
            onClick={() => {
              unlockSpeech()
              startRound()
            }}
          >
            🎤 开始跟读
          </button>
        </div>
      </div>
    )
  }

  // —— 结算 ——
  if (phase === 'result') {
    const totalStars = results.reduce<number>((s, r) => s + (r == null ? 0 : starOf(r)), 0)
    const maxStars = roundWords.length * 3
    const avgPct = Math.round(
      (100 * results.reduce<number>((s, r) => s + (r ?? 0), 0)) / Math.max(1, roundWords.length),
    )
    const wrongWords = roundWords.filter((_, i) => starOf(results[i] ?? 0) < 3)
    return (
      <div className="page">
        <h1>本轮结算</h1>
        <div className="card">
          <p className="echo-total">
            <b>{totalStars}</b>
            <span> / {maxStars} 星</span>
          </p>
          <p className="echo-avg">平均发音相似度 {avgPct}%，三星＝读得很准！</p>

          {wrongWords.length === 0 ? (
            <p className="echo-praise">全部三星！你的嘴巴太厉害啦！🎉</p>
          ) : (
            <button className="btn btn-warm btn-block echo-retry-round" onClick={() => startRound(wrongWords)}>
              🔁 错词重练（{wrongWords.length} 个）
            </button>
          )}

          <p className="echo-list-title">每词成绩（点小喇叭再听一遍）</p>
          {roundWords.map((w, i) => (
            <div className="echo-r-item" key={`${w.word}-${i}`}>
              <button
                className="echo-say-sm"
                onClick={() => speakWord(w.word)}
                aria-label={`听 ${w.word} 示范`}
              >
                🔊
              </button>
              <b>{w.word}</b>
              <span className="echo-r-kk">{w.kk}</span>
              <span className="echo-r-stars">{starsText(starOf(results[i] ?? 0))}</span>
            </div>
          ))}

          <div className="echo-actions">
            <button className="btn btn-primary btn-block" onClick={() => setPhase('pick')}>
              再来一轮
            </button>
          </div>
        </div>
      </div>
    )
  }

  // —— 跟读中 ——
  if (!word) return null
  const pct = ((index + (cur != null ? 1 : 0)) / roundWords.length) * 100
  return (
    <div className="page">
      <div className="echo-progress">
        <span>
          第 {index + 1} / {roundWords.length} 词
        </span>
        <div className="echo-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card echo-word-card">
        <p className="echo-word">{word.word}</p>
        <p className="echo-kk">{word.kk}</p>
        <div>
          <button className="btn-speak" onClick={() => speakWord(word.word)} disabled={listening}>
            🔊 听示范
          </button>
        </div>
      </div>

      <div className="card echo-mic-card">
        <button className={'echo-mic' + (listening ? ' on' : '')} onClick={toggleMic}>
          <span className="echo-mic-icon">{listening ? '⏹' : '🎤'}</span>
          <span>{listening ? '停止' : '开始说'}</span>
        </button>
        <p className="echo-mic-hint">
          {listening ? '正在听你说……说完会自动打分' : '点击按钮，然后大声读出上面的词'}
        </p>

        {listening && result && !result.final && <p className="echo-heard">听到：{result.text}</p>}
        {error && <p className="echo-error">😢 {error}</p>}

        {cur && (
          <div className={'echo-feedback f' + starOf(cur.score)}>
            <p className="echo-fb-stars">{starsText(starOf(cur.score))}</p>
            <p className="echo-fb-msg">{STAR_MSG[starOf(cur.score)]}</p>
            <p className="echo-fb-line">
              目标词 <b>{word.word}</b> {word.kk}
            </p>
            <p className="echo-fb-line">
              我听到：<b>{cur.text || '（没听清）'}</b>
            </p>
            <button className="echo-fav-btn" onClick={() => toggleFav(word.word)}>
              {favs.includes(word.word) ? '⭐ 已收藏这个词' : '☆ 收藏这个词，下次优先练'}
            </button>
            <div className="echo-actions">
              <button className="btn btn-ghost" onClick={retry}>
                🔄 再试一次
              </button>
              <button className="btn btn-primary" onClick={next}>
                {done ? '看结算' : '下一个词'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
