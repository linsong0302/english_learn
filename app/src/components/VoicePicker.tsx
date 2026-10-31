import { useState } from 'react'
import { getChantSettings, setChantSettings, VOICE_OPTIONS } from '../hooks/useSpeech'

/** 朗读语音选择（全应用统一）：紧凑版，口诀页之外的页面（如规则页）用它切换音色，
 *  与口诀页的朗读设置读写同一份配置，切换后全站点读立即换声音。 */
export default function VoicePicker() {
  const [voice, setVoice] = useState(getChantSettings().voice)

  const pick = (id: string) => {
    setVoice(id)
    setChantSettings({ ...getChantSettings(), voice: id })
  }

  return (
    <div className="voice-bar">
      <span className="voice-bar-label">朗读语音</span>
      <div className="seg voice-seg">
        {VOICE_OPTIONS.map((v) => (
          <button
            key={v.id}
            className={voice === v.id ? 'on' : ''}
            title={v.full}
            aria-label={`用${v.full}朗读`}
            onClick={() => pick(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}
