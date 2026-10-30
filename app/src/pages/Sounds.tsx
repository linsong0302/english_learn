import { useEffect, useMemo, useState } from 'react'
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
