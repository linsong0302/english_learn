import { useState } from 'react'
import {
  DEFAULT_CHANT_SETTINGS,
  getChantSettings,
  setChantSettings,
  VOICE_OPTIONS,
} from '../hooks/useSpeech'

const MIN = 0
const MAX = 1500
const STEP = 50

function fmt(ms: number) {
  return `${(ms / 1000).toFixed(2)} 秒`
}

/** 口诀朗读设置：朗读语音（甜妹/御姐等 6 种）+ 三处停顿间隔（滑动条常显、精确到毫秒）。
 *  字母间隔管「B 和 B 之间」、音标间隔管「BB 和啵啵之间」、叠字间隔管「啵 和 啵 之间」停多久：
 *  都拖大是「B，B，啵，啵」；都拖到 0 是全连「BB啵啵」。 */
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

  const letterGap0 = s.letterGapMs === 0
  const both0 = letterGap0 && s.phonemeGapMs === 0 && s.hanziGapMs === 0

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
      <label className="pace-row">
        <span className="pace-label">叠字间隔</span>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={s.hanziGapMs}
          onChange={(e) => update({ hanziGapMs: Number(e.target.value) })}
          aria-label="联想字两个字之间的间隔，如啵和啵之间"
        />
        <b className="pace-val">{fmt(s.hanziGapMs)}</b>
      </label>
      <p className="pace-note">
        {both0
          ? '全连「BB啵啵」：字母、联想字全部紧挨着读，中间不停；想加停顿就往右拖对应间隔。'
          : `B与B之间停 ${fmt(s.letterGapMs)}、BB与啵啵之间停 ${fmt(s.phonemeGapMs)}、啵与啵之间停 ${fmt(s.hanziGapMs)}；三个都拖到 0 秒就是全连「BB啵啵」。`}
        {' '}拖完点卡片试听。
      </p>
    </div>
  )
}
