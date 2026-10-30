import { useEffect, useMemo, useRef, useState } from 'react'
import phonemesData from '../data/phonemes.json'
import type { Phoneme } from '../types-phonemes'
import { speakWord, stopSpeaking } from '../hooks/useSpeech'
import './sounds.css'

// JSON 用契约类型断言（type 字面量在 JSON 导入时会被拓宽）
const PHONEMES = phonemesData as unknown as Phoneme[]

const TYPE_TABS = [
  { key: 'vowel', label: '元音' },
  { key: 'consonant', label: '辅音' },
  { key: 'combo', label: '组合' },
] as const
type TabKey = (typeof TYPE_TABS)[number]['key']

const TYPE_LABEL: Record<Phoneme['type'], string> = {
  vowel: '元音',
  consonant: '辅音',
  combo: '组合',
}

// lane5 音标总表：KK 音标分类卡片墙 + 单音标详情浮层（点读例词）。
export default function Sounds({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>('vowel')
  const [openId, setOpenId] = useState<string | null>(null)
  const [quizOpen, setQuizOpen] = useState(false)

  const list = useMemo(() => PHONEMES.filter((p) => p.type === tab), [tab])
  const open = openId ? PHONEMES.find((p) => p.id === openId) ?? null : null

  // 离开页面时停掉一切发音
  useEffect(() => stopSpeaking, [])

  return (
    <div className="extra-page">
      <header className="extra-header">
        <button className="extra-back" onClick={onClose}>← 返回</button>
        <b>音标总表</b>
      </header>

      <p className="snd-intro">
        点音标卡片看口型提示和例词；音标符号不能直接朗读，点读的都是例词。
      </p>

      <div className="snd-toolbar">
        <div className="seg">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'on' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="snd-count">共 {list.length} 个</span>
      </div>

      <button className="btn btn-warm btn-block snd-quiz-trigger" onClick={() => setQuizOpen(true)}>
        卡组自测：10 题小挑战
      </button>

      <div className="snd-grid">
        {list.map((p) => {
          const first = p.examples[0]
          return (
            <button
              key={p.id}
              type="button"
              className="snd-card"
              onClick={() => setOpenId(p.id)}
            >
              <b className="snd-kk">{p.kk}</b>
              <span className="snd-word">{first?.word}</span>
              <span
                className="btn-speak btn-speak-sm snd-say"
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  if (first) speakWord(first.word)
                }}
                aria-label={`读 ${first?.word ?? ''}`}
              >
                🔊
              </span>
            </button>
          )
        })}
      </div>

      {open && <PhonemeDetail phoneme={open} onClose={() => setOpenId(null)} />}
      {quizOpen && <SoundQuiz onClose={() => setQuizOpen(false)} />}
    </div>
  )
}

/** 单音标详情浮层：大音标 + 口型提示 + 例词点读 + 听示范 */
function PhonemeDetail({ phoneme, onClose }: { phoneme: Phoneme; onClose: () => void }) {
  const first = phoneme.examples[0]

  // 关闭浮层时停掉一切发音
  useEffect(() => stopSpeaking, [])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <b>音标详情</b>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="snd-hero">
          <b className="snd-hero-kk">{phoneme.kk}</b>
          <span className={`chip ${phoneme.type === 'vowel' ? '' : 'chip-blue'}`}>
            {TYPE_LABEL[phoneme.type]}
          </span>
        </div>

        <div className="snd-sec">
          <p className="snd-sec-title">口型提示</p>
          <p className="snd-tip-text">{phoneme.tip}</p>
        </div>

        <div className="snd-sec">
          <p className="snd-sec-title">例词点读</p>
          <ul className="snd-example-list">
            {phoneme.examples.map((ex) => (
              <li key={ex.word}>
                <button
                  type="button"
                  className="btn-speak btn-speak-sm"
                  onClick={() => speakWord(ex.word)}
                  aria-label={`读 ${ex.word}`}
                >
                  🔊
                </button>
                <b className="snd-ex-word">{ex.word}</b>
                <span className="snd-ex-kk">{ex.kk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="snd-actions">
          <button
            type="button"
            className="btn-speak"
            onClick={() => first && speakWord(first.word)}
            disabled={!first}
          >
            听示范{first ? `：${first.word}` : ''}
          </button>
        </div>
        <p className="card-hint">
          音标符号无法直接朗读，「听示范」读的是例词{first ? `「${first.word}」` : ''}，
          多听几遍，抓住它开头（或中间）的这个音。
        </p>
      </div>
    </div>
  )
}

// ==================== 卡组自测 ====================

const QUIZ_KEY = 'kk-sounds-quiz-v1' // 本页独立 key，不占用 store.ts 的进度
const QUIZ_LEN = 10

interface QuizRoundRecord {
  date: number
  score: number
  total: number
}

function loadQuizHistory(): QuizRoundRecord[] {
  try {
    const raw = localStorage.getItem(QUIZ_KEY)
    const list = raw ? (JSON.parse(raw) as QuizRoundRecord[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveQuizRound(score: number, total: number) {
  const history = loadQuizHistory()
  history.push({ date: Date.now(), score, total })
  try {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(history.slice(-30)))
  } catch {
    // 存储不可用时静默忽略
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface QuizQuestion {
  phoneme: Phoneme // 正确答案
  kind: 'listen' | 'tip' // 听例词选音标 / 看口型提示猜音标
  listenWord: string // 听力题朗读的例词
  options: Phoneme[] // 4 个选项（含正确答案）
}

/** 优先用同类音标做干扰项，凑不满再从其他类里补 */
function pickDistractors(answer: Phoneme): Phoneme[] {
  const sameType = shuffle(PHONEMES.filter((p) => p.id !== answer.id && p.type === answer.type))
  const others = shuffle(PHONEMES.filter((p) => p.id !== answer.id && p.type !== answer.type))
  return [...sameType, ...others].slice(0, 3)
}

function buildQuestions(): QuizQuestion[] {
  return shuffle(PHONEMES)
    .slice(0, QUIZ_LEN)
    .map((p, i) => {
      const kind = i % 2 === 0 ? 'listen' : 'tip' // 固定一半一半，两种题型都练到
      const ex = p.examples[Math.floor(Math.random() * p.examples.length)]
      return {
        phoneme: p,
        kind,
        listenWord: ex?.word ?? '',
        options: shuffle([p, ...pickDistractors(p)]),
      }
    })
}

/** 卡组自测：10 题混合「听例词选音标」和「看口型提示猜音标」，即时反馈 + 结算 */
function SoundQuiz({ onClose }: { onClose: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => buildQuestions())
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = questions[idx]

  // 听力题自动播例词（稍作停顿，避免和开浮层的反馈音打架）
  useEffect(() => {
    if (done || !q) return
    const t = setTimeout(() => {
      if (q.kind === 'listen' && q.listenWord) speakWord(q.listenWord)
    }, 400)
    return () => clearTimeout(t)
  }, [idx, done, q])

  // 结算时保存一轮成绩
  useEffect(() => {
    if (done) saveQuizRound(score, questions.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // 卸载时停发音、清计时器
  useEffect(
    () => () => {
      stopSpeaking()
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const choose = (id: string) => {
    if (!q || chosen || done) return
    setChosen(id)
    if (id === q.phoneme.id) setScore((s) => s + 1)
    timerRef.current = setTimeout(() => {
      stopSpeaking()
      if (idx + 1 >= questions.length) {
        setDone(true)
      } else {
        setIdx((i) => i + 1)
        setChosen(null)
      }
    }, 1000)
  }

  const restart = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    stopSpeaking()
    setQuestions(buildQuestions())
    setIdx(0)
    setChosen(null)
    setScore(0)
    setDone(false)
  }

  const history = loadQuizHistory()
  const totalAsked = history.reduce((n, r) => n + r.total, 0)
  const totalRight = history.reduce((n, r) => n + r.score, 0)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <b>卡组自测</b>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {q && !done && (
          <>
            <div className="snd-q-progress">
              <span className="chip chip-blue">
                {q.kind === 'listen' ? '听例词选音标' : '看口型提示猜音标'}
              </span>
              <span className="snd-q-count">
                第 {idx + 1} / {questions.length} 题
              </span>
            </div>
            <div className="dots">
              {questions.map((_, i) => (
                <span key={i} className={`dot ${i < idx ? 'on' : ''} ${i === idx ? 'cur' : ''}`} />
              ))}
            </div>

            <div className="snd-q-stem">
              {q.kind === 'listen' ? (
                <>
                  <p className="snd-q-lead">听一听，这个词里藏着哪个音标？</p>
                  <button
                    type="button"
                    className="btn-speak snd-q-replay"
                    onClick={() => q.listenWord && speakWord(q.listenWord)}
                  >
                    🔊 再听一遍
                  </button>
                </>
              ) : (
                <>
                  <p className="snd-q-lead">看口型提示，猜猜是哪个音标？</p>
                  <p className="snd-q-tip">{q.phoneme.tip}</p>
                </>
              )}
            </div>

            <div className="snd-opts">
              {q.options.map((o) => {
                const isAnswer = o.id === q.phoneme.id
                const isChosen = chosen === o.id
                const cls = chosen
                  ? isAnswer
                    ? 'correct'
                    : isChosen
                      ? 'wrong'
                      : 'dim'
                  : ''
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`snd-opt ${cls}`}
                    style={chosen ? { pointerEvents: 'none' } : undefined}
                    onClick={() => choose(o.id)}
                  >
                    {o.kk}
                  </button>
                )
              })}
            </div>

            {chosen && (
              <p className={`snd-feedback ${chosen === q.phoneme.id ? 'is-ok' : 'is-bad'}`}>
                {chosen === q.phoneme.id
                  ? '答对啦，真棒！'
                  : `正确答案是 ${q.phoneme.kk}`}
              </p>
            )}
          </>
        )}

        {done && (
          <div className="snd-result">
            <p className="snd-result-score">
              {score} / {questions.length}
            </p>
            <p className="snd-result-note">
              {score === questions.length
                ? '全对！你对这些音标已经很熟啦。'
                : score >= questions.length * 0.6
                  ? '不错哦！错的音标回卡片墙再听几遍例词。'
                  : '别灰心，先去卡片墙听听示范，再来挑战一次。'}
            </p>
            {history.length > 1 && (
              <p className="snd-result-history">
                累计 {history.length} 轮 · 正确率{' '}
                {Math.round((totalRight / Math.max(1, totalAsked)) * 100)}%
              </p>
            )}
            <div className="snd-actions snd-result-actions">
              <button type="button" className="btn btn-warm" onClick={restart}>
                再测一次
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                回卡片墙
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
