import { useState } from 'react'
import {
  DEFAULT_CHANT_SETTINGS,
  getChantSettings,
  setChantSettings,
  voiceFull,
  VOICE_OPTIONS,
} from '../hooks/useSpeech'

const MIN = 0
const MAX = 1500
const STEP = 50

function fmt(ms: number) {
  return `${(ms / 1000).toFixed(2)} 秒`
}

/** 口诀朗读设置：朗读语音（甜妹/御姐等 6 种）+ 朗读方式（连读/分段）。
 *  连读 = 整句一条录音最自然；分段 = 用滑动条控制两处间隔，适合自己跟读练习。 */
export default function ChantSettings() {
  const [s, setS] = useState(getChantSettings)

  const update = (patch: Partial<typeof s>) => {
    const next = { ...s, ...patch }
    setS(next)
    setChantSettings(next)
  }

  const reset = () => {
    setS({ ...DEFAULT_CHANT_SETTINGS })
    setChantSettings({ ...DEFAULT_CHANT_SETTINGS })
  }

  return (
    <div className="pace-card">
      <div className="pace-head">
        <b>朗读设置</b>
        <button className="pace-reset" onClick={reset}>
          恢复默认
        </button>
      </div>
      <div className="pace-row">
        <span className="pace-label">朗读语音</span>
        <div className="seg voice-seg">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.id}
              className={s.voice === v.id ? 'on' : ''}
              title={v.full}
              onClick={() => update({ voice: v.id })}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pace-row">
        <span className="pace-label">朗读方式</span>
        <div className="seg">
          <button
            className={s.mode === 'connected' ? 'on' : ''}
            onClick={() => update({ mode: 'connected' })}
          >
            连读
          </button>
          <button
            className={s.mode === 'segment' ? 'on' : ''}
            onClick={() => update({ mode: 'segment' })}
          >
            分段
          </button>
        </div>
      </div>
      {s.mode === 'segment' && (
        <>
          <label className="pace-row">
            <span className="pace-label">字母间隔</span>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={s.letterGapMs}
              onChange={(e) => update({ letterGapMs: Number(e.target.value) })}
              aria-label="两个字母之间的间隔"
            />
            <b className="pace-val">{fmt(s.letterGapMs)}</b>
          </label>
          <label className="pace-row">
            <span className="pace-label">音标间隔</span>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={s.phonemeGapMs}
              onChange={(e) => update({ phonemeGapMs: Number(e.target.value) })}
              aria-label="字母和音标之间的间隔"
            />
            <b className="pace-val">{fmt(s.phonemeGapMs)}</b>
          </label>
        </>
      )}
      <p className="pace-note">
        {s.mode === 'connected'
          ? `连读：${voiceFull(s.voice)}像老师带读一样一口气读完「B，B，啵啵」，点卡片试听；全站点读也用这个声音。`
          : `分段：拖动滑动条控制字母之间、字母和音标之间的停顿，拖完点卡片试听。`}
      </p>
    </div>
  )
}
