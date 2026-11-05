import { useEffect, useMemo, useState } from 'react'
import articlesData from '../data/articles.json'
import type { Article, CustomArticle } from '../lib/articleTypes'
import { speak, speakSentences, stopSpeaking } from '../hooks/useSpeech'
import { loadProgress, markWrongMastered } from '../store'
import { translateToChinese } from '../lib/translate'
import { fetchArticleFromUrl } from '../lib/fetchArticle'
import './reading.css'
const ARTICLES = articlesData as unknown as Article[]
const CUSTOM_KEY = 'kk-custom-articles-v1'
const RATE_KEY = 'kk-reading-rate-v1'
const WORDBOOK_KEY = 'kk-wordbook-v1'

/** 生词本条目：阅读时查过且查到意思的词 */
export interface WordBookItem {
  word: string
  meaning: string
  added: number
}

function loadWordBook(): WordBookItem[] {
  try {
    const raw = localStorage.getItem(WORDBOOK_KEY)
    const list = raw ? (JSON.parse(raw) as WordBookItem[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveWordBook(list: WordBookItem[]) {
  try {
    localStorage.setItem(WORDBOOK_KEY, JSON.stringify(list.slice(0, 300)))
  } catch {
    // 忽略
  }
}

/** 查到的词进生词本（去重，最新的在前） */
function addWordBookItem(word: string, meaning: string) {
  const clean = word.trim().toLowerCase()
  if (!clean || !meaning) return
  const list = loadWordBook().filter((it) => it.word !== clean)
  const next = [{ word: clean, meaning, added: Date.now() }, ...list]
  saveWordBook(next)
}

/** 正在阅读的文章（内置 / 自定义统一成一种形状） */
interface Active {
  kind: 'builtin' | 'custom'
  id: string
  title: string
  source: string
  paragraphs: string[][]
  /** 内置文章自带的参考译文（与 paragraphs 对齐） */
  translation?: string[]
  glossary: Record<string, string>
}

function parseCustomText(text: string): string[][] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g)
      const sents = (m ?? [p]).map((s) => s.trim()).filter(Boolean)
      return sents.length ? sents : [p]
    })
}

function loadCustom(): CustomArticle[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const list = raw ? (JSON.parse(raw) as CustomArticle[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveCustom(list: CustomArticle[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(0, 20)))
  } catch {
    // 存储不可用时静默忽略
  }
}

function loadRate(): number {
  const v = Number(localStorage.getItem(RATE_KEY))
  return v >= 0.5 && v <= 1.2 ? v : 0.8
}

/** 生词释义卡的状态 */
interface WordCard {
  word: string
  meaning: string
  from: string
  loading: boolean
  /** 该词所在句子的全文下标（供「从这句连播」） */
  sentIdx?: number
}

// lane8 英文阅读页：内置分级短文 + 粘贴自定义文章；点句朗读、点词查义、参考译文/在线翻译。
export default function Reading() {
  const [active, setActive] = useState<Active | null>(null)
  // 离开页面时停掉一切发音
  useEffect(() => stopSpeaking, [])
  return active ? (
    <Reader active={active} onBack={() => { stopSpeaking(); setActive(null) }} />
  ) : (
    <List onOpen={(a) => { stopSpeaking(); setActive(a) }} />
  )
}

// ==================== 文章列表 ====================

function List({ onOpen }: { onOpen: (a: Active) => void }) {
  const [custom, setCustom] = useState<CustomArticle[]>(loadCustom)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [book, setBook] = useState<WordBookItem[]>(loadWordBook)
  const [bookOpen, setBookOpen] = useState(false)
  const [quizOn, setQuizOn] = useState(false)
  const [manual, setManual] = useState('')
  const [adding, setAdding] = useState(false)
  const [fetchUrl, setFetchUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')

  /** 从网址抓取文章（BBC 等），成功直接进入阅读 */
  const grabUrl = async () => {
    if (!fetchUrl.trim() || fetching) return
    setFetching(true)
    setFetchMsg('')
    try {
      const { title, text } = await fetchArticleFromUrl(fetchUrl)
      const item: CustomArticle = { id: 'c' + Date.now(), title, text, added: Date.now() }
      const next = [item, ...custom]
      setCustom(next)
      saveCustom(next)
      setFetchUrl('')
      onOpen({ kind: 'custom', id: item.id, title, source: '网页抓取', paragraphs: parseCustomText(text), glossary: {} })
    } catch (e) {
      setFetchMsg(`抓取失败：${e instanceof Error ? e.message : '网络不通'}。可以打开网页复制文字，用下面的粘贴方式。`)
    } finally {
      setFetching(false)
    }
  }
  const [wrong, setWrong] = useState(() =>
    Object.values(loadProgress().wrong).filter((w) => !w.mastered),
  )
  const [wrongOpen, setWrongOpen] = useState(false)
  const [wrongBusy, setWrongBusy] = useState<string | null>(null)

  /** 错题词 → 在线查释义 → 收进生词本 → 标记已掌握 */
  const collectWrong = async (w: string, kk: string) => {
    if (wrongBusy) return
    setWrongBusy(w)
    let meaning = ''
    try {
      meaning = await translateToChinese(w)
    } catch {
      meaning = ''
    }
    addWordBookItem(w, meaning || `本词音标 ${kk}（释义待查）`)
    markWrongMastered(w)
    setWrong((s) => s.filter((x) => x.word !== w))
    setWrongBusy(null)
  }

  const addManual = async () => {
    const w = manual.replace(/[^A-Za-z']/g, '').toLowerCase()
    if (!w || adding || book.some((it) => it.word === w)) {
      setManual('')
      return
    }
    setAdding(true)
    let meaning = ''
    try {
      meaning = await translateToChinese(w)
    } catch {
      meaning = ''
    }
    const next = [{ word: w, meaning: meaning || '（暂无释义，稍后可删）', added: Date.now() }, ...book]
    setBook(next)
    saveWordBook(next)
    setManual('')
    setAdding(false)
  }

  const removeWord = (w: string) => {
    const next = book.filter((it) => it.word !== w)
    setBook(next)
    saveWordBook(next)
  }

  const saveForm = () => {
    if (!text.trim()) return
    const item: CustomArticle = {
      id: 'c' + Date.now(),
      title: title.trim() || '我的英文文章',
      text: text.trim(),
      added: Date.now(),
    }
    const next = [item, ...custom]
    setCustom(next)
    saveCustom(next)
    setTitle('')
    setText('')
    setFormOpen(false)
    onOpen({ kind: 'custom', id: item.id, title: item.title, source: '我的粘贴文章', paragraphs: parseCustomText(item.text), glossary: {} })
  }

  const remove = (id: string) => {
    const next = custom.filter((c) => c.id !== id)
    setCustom(next)
    saveCustom(next)
  }

  return (
    <div className="page rd-page">
      <h1>英文阅读</h1>
      <p className="rd-sub">点句子听朗读、点单词查意思；内置短文自带中文翻译，也可以粘贴任何你喜欢的英文文章。</p>

      <div className="rd-hero">
        <b>每天读一点，语感自然来</b>
        <p>先听再跟读：点任意句子就会从那句开始朗读，再点一次停止。</p>
      </div>

      <div className="rd-book">
        {wrong.length > 0 && (
          <div className="rd-book rd-wrong">
            <button className="rd-book-head" onClick={() => setWrongOpen(!wrongOpen)}>
              <b>❗ 练习错题词（{wrong.length}）</b>
              <span>{wrongOpen ? '收起 ▲' : '收进生词本巩固 ▼'}</span>
            </button>
            {wrongOpen && (
              <div className="rd-book-list">
                <p className="rd-empty">这些词在练习里答错过，点「收进生词本」加入听写巩固。</p>
                {wrong.map((it) => (
                  <div key={it.word} className="rd-book-item">
                    <span className="rd-book-word">{it.word}</span>
                    <span className="rd-book-meaning">{it.kk}</span>
                    <button
                      className="rd-mini"
                      onClick={() => collectWrong(it.word, it.kk)}
                      disabled={wrongBusy === it.word}
                    >
                      {wrongBusy === it.word ? '加入中…' : '➕ 收进生词本'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="rd-book-head" onClick={() => setBookOpen(!bookOpen)}>
          <b>📌 我的生词本（{book.length}）</b>
          <span>{bookOpen ? '收起 ▲' : '展开 ▼'}</span>
        </button>
        {bookOpen && (
          <div className="rd-book-list">
            <div className="rd-book-addrow">
              <input
                className="rd-input"
                placeholder="手动加一个单词（回车确认）"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addManual()
                }}
              />
              <button className="btn-speak btn-speak-sm" onClick={addManual} disabled={adding}>
                {adding ? '查询中…' : '添加'}
              </button>
            </div>
            {book.length === 0 && (
              <p className="rd-empty">读文章时点单词查意思，查过的词会自动收进生词本。</p>
            )}
            {book.map((it) => (
              <div key={it.word} className="rd-book-item">
                <button
                  className="btn-speak btn-speak-sm"
                  onClick={() => {
                    stopSpeaking()
                    speak(it.word, { rate: 0.8 })
                  }}
                  aria-label={`读 ${it.word}`}
                >
                  🔊
                </button>
                <span className="rd-book-word">{it.word}</span>
                <span className="rd-book-meaning">{it.meaning}</span>
                <button className="rd-del" aria-label="删除" onClick={() => removeWord(it.word)}>
                  ×
                </button>
              </div>
            ))}
            {book.length > 0 && (
              <div className="rd-book-foot">
                {book.length >= 4 && (
                  <button className="rd-mini rd-book-quiz" onClick={() => setQuizOn(true)}>
                    🎯 听写挑战
                  </button>
                )}
                <button
                  className="rd-mini rd-book-clear"
                  onClick={() => {
                    setBook([])
                    saveWordBook([])
                  }}
                >
                  清空生词本
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {quizOn && <WordQuiz book={book} onClose={() => setQuizOn(false)} />}

      <h2 className="rd-sec">精选短文（含参考译文）</h2>
      {ARTICLES.map((a, i) => (
        <button
          key={a.id}
          className={`rd-art-card lv${a.level}`}
          onClick={() =>
            onOpen({ kind: 'builtin', id: a.id, title: a.title, source: a.source, paragraphs: a.paragraphs, translation: a.translation, glossary: a.glossary })
          }
        >
          <span className={`rd-cover c${i % 3}`}>{a.level === 1 ? 'L1' : 'L2'}</span>
          <span className="rd-art-main">
            <b>{a.title}</b>
            <span className="rd-art-meta">
              {a.source} · {a.paragraphs.flat().length} 句 · 含译文
            </span>
          </span>
          <span className="rd-arrow">→</span>
        </button>
      ))}

      <h2 className="rd-sec">从网址抓取（BBC 等英文网站）</h2>
      <div className="rd-fetch">
        <input
          className="rd-input"
          placeholder="粘贴文章网址，如 https://www.bbc.com/…"
          value={fetchUrl}
          onChange={(e) => setFetchUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') grabUrl()
          }}
        />
        <button className="btn-speak btn-speak-sm" onClick={grabUrl} disabled={fetching || !fetchUrl.trim()}>
          {fetching ? '抓取中…' : '🌐 抓取'}
        </button>
      </div>
      {fetchMsg && <p className="rd-fetch-msg">{fetchMsg}</p>}

      <h2 className="rd-sec">我的文章</h2>
      {!formOpen ? (
        <button className="rd-paste" onClick={() => setFormOpen(true)}>
          ＋ 粘贴一篇英文文章（BBC、课文……都可以）
        </button>
      ) : (
        <div className="rd-form">
          <input
            className="rd-input"
            placeholder="给文章起个标题（可留空）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="rd-area"
            rows={6}
            placeholder="把英文文章粘贴到这里……（空行分段）"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="rd-form-btns">
            <button className="btn btn-warm" onClick={saveForm} disabled={!text.trim()}>
              保存并阅读
            </button>
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              取消
            </button>
          </div>
        </div>
      )}
      {custom.map((c) => (
        <div key={c.id} className="rd-art-card rd-custom">
          <button
            className="rd-art-main as-btn"
            onClick={() => onOpen({ kind: 'custom', id: c.id, title: c.title, source: '我的粘贴文章', paragraphs: parseCustomText(c.text), glossary: {} })}
          >
            <b>{c.title}</b>
            <span className="rd-art-meta">{parseCustomText(c.text).flat().length} 句 · 可在线翻译</span>
          </button>
          <button className="rd-del" aria-label="删除" onClick={() => remove(c.id)}>
            ×
          </button>
        </div>
      ))}
      {custom.length === 0 && !formOpen && <p className="rd-empty">还没有粘贴过文章。</p>}
    </div>
  )
}

// ==================== 阅读视图 ====================

interface ParaTr {
  status: 'idle' | 'loading' | 'ok' | 'err'
  text?: string
}

function Reader({ active, onBack }: { active: Active; onBack: () => void }) {
  const sentences = useMemo(() => active.paragraphs.flat(), [active])
  const [rate, setRate] = useState(loadRate)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState<number | null>(null)
  const [showTrans, setShowTrans] = useState(true)
  const [card, setCard] = useState<WordCard | null>(null)
  const [paraTr, setParaTr] = useState<Record<number, ParaTr>>({})
  const [fs, setFs] = useState(17)

  // 离开阅读视图时停掉发音
  useEffect(() => stopSpeaking, [])

  const play = (from: number) => {
    stopSpeaking()
    setPlaying(true)
    setCur(from)
    speakSentences(sentences.slice(from), {
      rate,
      onSentence: (j) => setCur(from + j),
      onDone: () => {
        setPlaying(false)
        setCur(null)
      },
    })
  }

  const stop = () => {
    stopSpeaking()
    setPlaying(false)
    setCur(null)
  }

  const tapSentence = (i: number) => {
    if (playing && cur === i) stop()
    else play(i)
  }

  // 连播时当前句自动滚入视野（跟随朗读）
  useEffect(() => {
    if (cur === null) return
    document.querySelector(`[data-sent="${cur}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [cur])

  const changeRate = (v: number) => {
    setRate(v)
    try {
      localStorage.setItem(RATE_KEY, String(v))
    } catch {
      // 忽略
    }
    if (playing && cur !== null) play(cur) // 朗读中调速：从当前句重读
  }

  const lookupWord = async (raw: string, sentIdx?: number) => {
    const word = raw.replace(/[^A-Za-z']/g, '').toLowerCase()
    if (!word) return
    const gloss = active.glossary[word]
    if (gloss) {
      setCard({ word, meaning: gloss, from: '本文词表', loading: false, sentIdx })
      addWordBookItem(word, gloss)
      return
    }
    setCard({ word, meaning: '', from: '在线翻译', loading: true, sentIdx })
    try {
      const m = await translateToChinese(word)
      setCard({ word, meaning: m || '没有查到这个词', from: '在线翻译', loading: false, sentIdx })
      if (m) addWordBookItem(word, m)
    } catch {
      setCard({ word, meaning: '没有查到这个词（在线翻译连不上，请检查网络）', from: '查询失败', loading: false, sentIdx })
    }
  }

  const translatePara = async (pi: number) => {
    const text = active.paragraphs[pi].join(' ')
    setParaTr((s) => ({ ...s, [pi]: { status: 'loading' } }))
    try {
      const out = await translateToChinese(text)
      setParaTr((s) => ({ ...s, [pi]: { status: 'ok', text: out } }))
    } catch {
      setParaTr((s) => ({ ...s, [pi]: { status: 'err', text: '翻译服务暂时连不上，请检查网络后重试。' } }))
    }
  }

  let si = -1 // 句子在全文中的下标（渲染时递增）

  return (
    <div className="page rd-page rd-reader">
      <header className="rd-head">
        <button className="rd-back" onClick={onBack} aria-label="返回">
          ←
        </button>
        <div className="rd-head-main">
          <b>{active.title}</b>
          <span>{active.source}</span>
        </div>
      </header>

      <div className="rd-toolbar">
        <button className={`rd-play ${playing ? 'on' : ''}`} onClick={() => (playing ? stop() : play(0))}>
          {playing ? '⏹ 停止' : '▶ 连播全文'}
        </button>
        <label className="rd-rate">
          语速
          <input
            type="range"
            min={0.6}
            max={1}
            step={0.05}
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            aria-label="朗读语速"
          />
          <b>{rate.toFixed(2)}x</b>
        </label>
        {active.translation && (
          <button className={`rd-toggle ${showTrans ? 'on' : ''}`} onClick={() => setShowTrans(!showTrans)}>
            译文
          </button>
        )}
        <div className="rd-fs">
          <button onClick={() => setFs((v) => Math.max(14, v - 1))} aria-label="缩小字号">
            A-
          </button>
          <button onClick={() => setFs((v) => Math.min(22, v + 1))} aria-label="放大字号">
            A+
          </button>
        </div>
      </div>

      <article className="rd-body">
        {active.paragraphs.map((para, pi) => {
          const start = si + 1
          si += para.length
          return (
            <section key={pi} className="rd-para">
              <p className="rd-en" style={{ fontSize: fs }}>
                {para.map((s, j) => {
                  const idx = start + j
                  return (
                    <span
                      key={j}
                      data-sent={idx}
                      className={`rd-sent ${cur === idx ? 'cur' : ''} ${playing && (cur ?? -1) > idx ? 'done' : ''}`}
                      onClick={() => tapSentence(idx)}
                    >
                      {s.split(/(\s+)/).map((tok, ti) =>
                        /^\s+$/.test(tok) ? (
                          <span key={ti}> </span>
                        ) : (
                          <span
                            key={ti}
                            className="rd-word"
                            onClick={(e) => {
                              e.stopPropagation()
                              lookupWord(tok, idx)
                            }}
                          >
                            {tok}
                          </span>
                        ),
                      )}
                    </span>
                  )
                })}
              </p>
              {active.kind === 'builtin' && active.translation && showTrans && (
                <p className="rd-cn">{active.translation[pi]}</p>
              )}
              {active.kind === 'custom' && (
                <div className="rd-cn-ops">
                  {paraTr[pi]?.status === 'ok' ? (
                    <p className="rd-cn">{paraTr[pi].text}</p>
                  ) : paraTr[pi]?.status === 'loading' ? (
                    <p className="rd-cn rd-cn-loading">翻译中……</p>
                  ) : paraTr[pi]?.status === 'err' ? (
                    <>
                      <p className="rd-cn rd-cn-err">{paraTr[pi].text}</p>
                      <button className="rd-mini" onClick={() => translatePara(pi)}>
                        重试
                      </button>
                    </>
                  ) : (
                    <button className="rd-mini" onClick={() => translatePara(pi)}>
                      译成中文
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </article>

      <p className="rd-tip">点句子：从那句开始朗读 / 停止 · 点单词：查意思{playing && cur !== null ? ` · 正在读第 ${cur + 1}/${sentences.length} 句` : ''}</p>

      {card && (
        <div className="rd-overlay" onClick={() => setCard(null)}>
          <div className="rd-sheet" onClick={(e) => e.stopPropagation()}>
            {card.loading ? (
              <p className="rd-sheet-loading">查询中……</p>
            ) : (
              <>
                <b className="rd-sheet-word">{card.word}</b>
                <p className="rd-sheet-meaning">{card.meaning}</p>
                <p className="rd-sheet-from">来源：{card.from}</p>
              </>
            )}
            <div className="rd-sheet-btns">
              {!card.loading && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    stopSpeaking()
                    speak(card.word, { rate: 0.8 })
                  }}
                >
                  🔊 听单词
                </button>
              )}
              {card.sentIdx !== undefined && (
                <button
                  className="btn btn-warm"
                  onClick={() => {
                    setCard(null)
                    tapSentence(card.sentIdx!)
                  }}
                >
                  ▶ 从这句连播
                </button>
              )}
              {!card.loading && card.sentIdx === undefined && (
                <button className="btn btn-ghost rd-sheet-close" onClick={() => setCard(null)}>
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 生词本听写挑战 ====================

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface QuizQ {
  word: string
  meaning: string
  options: string[]
  answerIdx: number
}

/** 一次最多 10 题；干扰项取自生词本里其他词的意思（意思去重） */
function buildQuizQuestions(book: WordBookItem[]): QuizQ[] {
  return shuffle(book)
    .slice(0, 10)
    .map((it) => {
      const others = shuffle(
        [...new Set(book.filter((b) => b.word !== it.word).map((b) => b.meaning))].filter(
          (m) => m !== it.meaning,
        ),
      ).slice(0, 3)
      const options = shuffle([it.meaning, ...others])
      return { word: it.word, meaning: it.meaning, options, answerIdx: options.indexOf(it.meaning) }
    })
}

/** 听写挑战：播单词 → 四选一选意思 */
function WordQuiz({ book, onClose }: { book: WordBookItem[]; onClose: () => void }) {
  const [qs, setQs] = useState<QuizQ[]>(() => buildQuizQuestions(book))
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const q = qs[idx]

  // 每道题自动播一遍单词（idx 变化触发，选完不重复播）
  useEffect(() => {
    if (q && !done) speak(q.word, { rate: 0.75 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done])

  useEffect(() => stopSpeaking, [])

  const choose = (i: number) => {
    if (chosen !== null) return
    setChosen(i)
    if (i === q.answerIdx) setScore((s) => s + 1)
    setTimeout(() => {
      stopSpeaking()
      if (idx + 1 >= qs.length) setDone(true)
      else {
        setIdx(idx + 1)
        setChosen(null)
      }
    }, 900)
  }

  const restart = () => {
    setQs(buildQuizQuestions(book))
    setIdx(0)
    setChosen(null)
    setScore(0)
    setDone(false)
  }

  return (
    <div className="rd-overlay" onClick={onClose}>
      <div className="rd-sheet" onClick={(e) => e.stopPropagation()}>
        {!done && q ? (
          <>
            <div className="rd-q-head">
              <b>听写挑战 · 第 {idx + 1}/{qs.length} 题</b>
              <span>得分 {score}</span>
            </div>
            <div className="rd-q-say">
              <button className="btn-speak" onClick={() => speak(q.word, { rate: 0.7 })}>
                🔊 再听一遍
              </button>
            </div>
            <p className="rd-q-lead">刚才的单词是什么意思？</p>
            <div className="rd-q-opts">
              {q.options.map((op, i) => {
                const cls = chosen === null ? '' : i === q.answerIdx ? 'ok' : chosen === i ? 'bad' : 'dim'
                return (
                  <button key={i} className={`rd-q-opt ${cls}`} onClick={() => choose(i)}>
                    {op}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <b className="rd-sheet-word">挑战结束！</b>
            <p className="rd-sheet-meaning">
              得分 {score} / {qs.length}
              {score === qs.length ? '，全对，太棒了！' : '。错过的词去生词本再读几遍吧。'}
            </p>
            <div className="wr-editor-btns">
              <button className="btn btn-warm" onClick={restart}>
                再来一轮
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                关闭
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
