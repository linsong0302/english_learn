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

/** 口诀朗读设置：朗读语音（甜妹/御姐等 6 种）+ 两处停顿间隔（滑动条常显）。
 *  间隔拖大 = 字母之间有逗号一样的停顿，适合跟读；
 *  两个间隔都拖到 0 秒 = 整句录音连读，像老师带读。 */
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

  const connected = s.letterGapMs === 0 && s.phonemeGapMs === 0

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
      <p className="pace-note">
        {connected
          ? `连读：${voiceFull(s.voice)}像老师带读一样一口气读完「B，B，啵啵」；把间隔拖大就有停顿，适合自己跟读。`
          : '字母之间、字母和音标之间各停一小段，像念逗号一样清楚；两个间隔都拖到 0 秒就变回连读。拖完点卡片试听。'}
      </p>
    </div>
  )
}
