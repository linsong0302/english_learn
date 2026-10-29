import { useState } from 'react'
import lettersData from '../data/letters.json'
import LetterCard from '../components/LetterCard'
import LetterDetail from '../components/LetterDetail'
import { loadProgress } from '../store'
import type { LetterSound } from '../types'
import './chant.css'

// JSON 用契约类型断言（position 等字面量在 JSON 导入时会被拓宽）
const LETTERS = lettersData as unknown as LetterSound[]

// lane2 口诀页：26 字母卡片墙 + 单字母详情浮层（连读模式见 AutoBar）。
export default function Chant() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const seenSet = new Set(loadProgress().seenLetters)

  const open: LetterSound | null = openIdx === null ? null : LETTERS[openIdx]

  return (
    <div className="page">
      <h1>字母口诀</h1>
      <p className="page-sub">
        点卡片看详情：字母音 + KK 音标 + 联想汉字；点例词直接点读。
      </p>
      <div className="chant-wall">
        {LETTERS.map((l, i) => (
          <LetterCard
            key={l.letter}
            letter={l}
            seen={seenSet.has(l.letter)}
            onOpen={() => setOpenIdx(i)}
          />
        ))}
      </div>

      {open && <LetterDetail letter={open} onClose={() => setOpenIdx(null)} />}
    </div>
  )
}
