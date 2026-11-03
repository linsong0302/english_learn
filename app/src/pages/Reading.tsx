import { useEffect, useMemo, useState } from 'react'
import articlesData from '../data/articles.json'
import type { Article, CustomArticle } from '../lib/articleTypes'
import { speakSentences, stopSpeaking } from '../hooks/useSpeech'
import { translateToChinese } from '../lib/translate'
import './reading.css'

const ARTICLES = articlesData as unknown as Article[]
const CUSTOM_KEY = 'kk-custom-articles-v1'
const RATE_KEY = 'kk-reading-rate-v1'

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

  const changeRate = (v: number) => {
    setRate(v)
    try {
      localStorage.setItem(RATE_KEY, String(v))
    } catch {
      // 忽略
    }
    if (playing && cur !== null) play(cur) // 朗读中调速：从当前句重读
  }

  const lookupWord = async (raw: string) => {
    const word = raw.replace(/[^A-Za-z']/g, '').toLowerCase()
    if (!word) return
    const gloss = active.glossary[word]
    if (gloss) {
      setCard({ word, meaning: gloss, from: '本文词表', loading: false })
      return
    }
    setCard({ word, meaning: '', from: '在线翻译', loading: true })
    try {
      const m = await translateToChinese(word)
      setCard({ word, meaning: m || '没有查到这个词', from: '在线翻译', loading: false })
    } catch {
      setCard({ word, meaning: '没有查到这个词（在线翻译连不上，请检查网络）', from: '查询失败', loading: false })
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
          {playing ? '⏹ 停止' : '▶ 从头读'}
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
      </div>

      <article className="rd-body">
        {active.paragraphs.map((para, pi) => {
          const start = si + 1
          si += para.length
          return (
            <section key={pi} className="rd-para">
              <p className="rd-en">
                {para.map((s, j) => {
                  const idx = start + j
                  return (
                    <span
                      key={j}
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
                              lookupWord(tok)
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
            <button className="btn btn-ghost rd-sheet-close" onClick={() => setCard(null)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
