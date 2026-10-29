import { useState } from 'react'
import type { LetterSound } from '../types'
import { speakWord } from '../hooks/useSpeech'

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
