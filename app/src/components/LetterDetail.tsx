import { useEffect, useState } from 'react'
import type { LetterSound } from '../types'
import { addSeenLetter } from '../store'
import { speakLetter, speakLetterAndPhoneme, speakSequence, speakWord, stopSpeaking } from '../hooks/useSpeech'
import EchoCompare from './EchoCompare'

interface Props {
  letter: LetterSound
  onClose: () => void
}

/** 单字母详情浮层：口型提示 + 2+2 跟读（字母音×2 → 停顿 → 例词音×2） */
export default function LetterDetail({ letter, onClose }: Props) {
  const hasVariants = !!letter.variants?.length
  const [variantIdx, setVariantIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const variant = hasVariants ? letter.variants![variantIdx] : null
  const kk = variant?.kk ?? letter.kk
  const hint = variant?.hint ?? letter.hint
  // 联想汉字去掉「前：/后：」前缀和括号注释后，就是要跟读的音标近似音
  const phonemeHanzi = hint.replace(/^前：|^后：/, '').replace(/（[^）]*）/g, '')

  // 打开详情即记入「已学口诀」进度
  useEffect(() => {
    addSeenLetter(letter.letter)
  }, [letter.letter])

  // 关闭浮层时停掉一切发音
  useEffect(() => stopSpeaking, [])

  /** 2+2 跟读：先播字母音×2，再播例词音×2，中间留间隔 */
  const startEcho = () => {
    if (playing) {
      stopSpeaking()
      setPlaying(false)
      return
    }
    setPlaying(true)
    speakSequence(
      [
        { text: letter.upper, pauseAfter: 250 },
        { text: letter.upper, pauseAfter: 600 },
        { text: letter.sample, pauseAfter: 250 },
        { text: letter.sample },
      ],
      { onDone: () => setPlaying(false) },
    )
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <b>字母详情</b>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="cd-hero">
          <span className="cd-letter">{letter.upper}</span>
          <b className="cd-kk">{kk}</b>
          <span className="cd-hint">{hint}</span>
        </div>

        {hasVariants && (
          <div className="cd-variants">
            <div className="seg">
              <button
                className={variantIdx === 0 ? 'on' : ''}
                onClick={() => setVariantIdx(0)}
              >
                词首读法
              </button>
              <button
                className={variantIdx === 1 ? 'on' : ''}
                onClick={() => setVariantIdx(1)}
              >
                词尾读法
              </button>
            </div>
            <ul className="cd-variant-list">
              {letter.variants!.map((v) => (
                <li key={v.position}>
                  <span className={`chip ${v.position === 'final' ? 'chip-blue' : ''}`}>
                    {v.position === 'initial' ? '词首' : '词尾'}
                  </span>
                  <b>{v.kk}</b>
                  <span>{v.hint.replace(/^前：|^后：/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {letter.tips?.length ? (
          <div className="cd-tips">
            <p className="card-title">口型提示</p>
            <ul>
              {letter.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="cd-actions">
          <button className="btn-speak" onClick={() => speakLetter(letter.upper)}>
            听字母音
          </button>
          <button
            className="btn-speak"
            aria-label="字母加音标连读"
            onClick={() => {
              // l/m/n/r 的「词尾读法」播 -final 整句/音标录音
              const opts =
                hasVariants && variantIdx === 1 ? { key: `${letter.letter}-final` } : undefined
              speakLetterAndPhoneme(letter.upper, phonemeHanzi, opts)
            }}
          >
            字母＋音标
          </button>
          <button className={`btn ${playing ? 'btn-ghost' : 'btn-primary'}`} onClick={startEcho}>
            {playing ? '停止跟读' : '2+2 跟读'}
          </button>
          <button className="btn-speak" onClick={() => speakWord(letter.sample)}>
            听例词
          </button>
        </div>
        <p className="cd-echo-note">
          2+2 跟读：字母音读 2 遍 → 例词读 2 遍，跟着一起大声说。「字母＋音标」先读 2
          遍字母，再用联想汉字读出音标音（「啵啵」就是音标读了 2 遍）。
        </p>

        <EchoCompare upper={letter.upper} sample={letter.sample} />
      </div>
    </div>
  )
}
