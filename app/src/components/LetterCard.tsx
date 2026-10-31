import { useState } from 'react'
import type { LetterSound } from '../types'
import { speakLetterAndPhoneme, speakWord } from '../hooks/useSpeech'

interface Props {
  letter: LetterSound
  seen: boolean
  onOpen: () => void
}

/** 口诀墙上的单张字母卡片：大字母 + KK 音标 + 联想汉字 + 例词点读 */
export default function LetterCard({ letter, seen, onOpen }: Props) {
  const hasVariants = !!letter.variants?.length
  const [variantIdx, setVariantIdx] = useState(0)
  const variant = hasVariants ? letter.variants![variantIdx] : null
  const kk = variant?.kk ?? letter.kk
  const hint = variant?.hint ?? letter.hint
  // 联想汉字去掉「前：/后：」前缀和括号注释后，就是要跟读的音标近似音
  const phonemeHanzi = hint.replace(/^前：|^后：/, '').replace(/（[^）]*）/g, '')

  return (
    <div
      className={`chant-card ${seen ? 'seen' : ''}`}
      role="button"
      onClick={onOpen}
    >
      <span className="cc-letter">{letter.upper}</span>
      <b className="cc-kk">{kk}</b>
      <span className="cc-hint">{hint}</span>
      {hasVariants && (
        <span className="cc-variant" onClick={(e) => e.stopPropagation()}>
          <button
            className={variantIdx === 0 ? 'on' : ''}
            onClick={() => setVariantIdx(0)}
          >
            前
          </button>
          <button
            className={variantIdx === 1 ? 'on' : ''}
            onClick={() => setVariantIdx(1)}
          >
            后
          </button>
        </span>
      )}
      <button
        className="btn-speak btn-speak-sm cc-phoneme"
        aria-label={`${letter.upper} 加音标跟读`}
        onClick={(e) => {
          e.stopPropagation()
          // l/m/n/r 的「后」读法播 -final 整句/音标录音
          const opts =
            hasVariants && variantIdx === 1 ? { key: `${letter.letter}-final` } : undefined
          speakLetterAndPhoneme(letter.upper, phonemeHanzi, opts)
        }}
      >
        🔊 {phonemeHanzi}
      </button>
      <button
        className="btn-speak btn-speak-sm cc-sample"
        onClick={(e) => {
          e.stopPropagation()
          speakWord(letter.sample) // 例词点读
        }}
      >
        {letter.sample}
      </button>
    </div>
  )
}
