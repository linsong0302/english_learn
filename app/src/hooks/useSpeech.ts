// 全站唯一的发音出口：Web Speech API 封装（lane2 负责完善）。
// 若设备没有英文语音，退回系统默认语音；UI 可用 supported 做降级提示。

let cachedVoice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice =
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  return cachedVoice
}

export const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

// iOS/Safari 需要用户首次交互后才能出声；在第一次点击发音按钮时调用
export function unlockSpeech() {
  if (!supported) return
  try {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
  } catch {
    // 忽略解锁失败
  }
}

export interface SpeakOptions {
  rate?: number // 默认 0.75，适合初学者跟读
  lang?: string
}

export function speak(text: string, opts: SpeakOptions = {}) {
  if (!supported) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) u.voice = voice
  u.lang = opts.lang ?? voice?.lang ?? 'en-US'
  u.rate = opts.rate ?? 0.75
  window.speechSynthesis.speak(u)
}

export function speakWord(word: string) {
  speak(word, { rate: 0.75 })
}

export function speakLetter(letter: string) {
  speak(letter, { rate: 0.75 })
}

// 语音列表是异步加载的，提前触发一次加载
if (supported) {
  try {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = null
      pickVoice()
    }
  } catch {
    // 忽略
  }
}
