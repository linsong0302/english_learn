import { useEffect, useState } from 'react'
import type { LetterSound } from '../types'
import { addSeenLetter } from '../store'
import { speakSequence, stopSpeaking } from '../hooks/useSpeech'

interface Props {
  letters: LetterSound[]
  onClose: () => void
}

type Mode = 'playing' | 'paused' | 'done'

/** 口诀连读模式：a→z 每个字母播 2+2，可暂停/继续/手动下一个，底部进度点。 */
export default function ChantAuto({ letters, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('playing')
  const [idx, setIdx] = useState(0)

  // 播放当前字母：2+2（字母音×2 → 例词音×2），播完自动前进
  useEffect(() => {
    if (mode !== 'playing') return
    const l = letters[idx]
    if (!l) return
    addSeenLetter(l.letter)
    speakSequence(
      [
        { text: l.upper, pauseAfter: 250 },
        { text: l.upper, pauseAfter: 700 },
        { text: l.sample, pauseAfter: 250 },
        { text: l.sample },
      ],
      {
        onDone: () => {
          if (idx < letters.length - 1) setIdx(idx + 1)
          else setMode('done')
        },
      },
    )
    return () => stopSpeaking()
  }, [mode, idx, letters])

  // 面板卸载时停止一切发音
  useEffect(() => stopSpeaking, [])

  const cur = letters[idx]

  const restart = () => {
    setIdx(0)
    setMode('playing')
  }

  const next = () => {
    if (idx < letters.length - 1) setIdx(idx + 1)
  }

  return (
    <div className="auto-panel">
      {mode === 'done' ? (
        <div className="auto-done">
          <b>读完 1 遍啦，真棒！</b>
          <p>建议读满 20 遍，早晚各读 3 遍效果最好。</p>
          <div className="auto-ctrls">
            <button className="btn btn-warm" onClick={restart}>
              再来一遍
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="auto-head">
            <div className="auto-cur">
              <span className="auto-cur-letter">{cur.upper}</span>
              <b className="auto-cur-kk">{cur.kk}</b>
            </div>
            <div className="auto-meta">
              <b>{cur.hint}</b>
              <span>
                例词：{cur.sample} · {idx + 1}/{letters.length}
              </span>
            </div>
          </div>
          <div className="dots auto-dots">
            {letters.map((l, i) => (
              <span
                key={l.letter}
                className={`dot ${i < idx ? 'on' : ''} ${i === idx && mode === 'playing' ? 'cur' : ''}`}
              />
            ))}
          </div>
          <div className="auto-ctrls">
            <button
              className="btn btn-primary"
              onClick={() => setMode(mode === 'playing' ? 'paused' : 'playing')}
            >
              {mode === 'playing' ? '暂停' : '继续'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={next}
              disabled={idx >= letters.length - 1}
            >
              下一个
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        </>
      )}
    </div>
  )
}
