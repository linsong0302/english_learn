// 全站唯一的发音出口：Web Speech API 封装（lane2 负责）。
// 所有页面发音一律 import 本文件，禁止直接调用 speechSynthesis。
// 若设备没有英文语音，退回系统默认语音；UI 可用 supported 做降级提示。

const DEFAULT_RATE = 0.75 // 适合初学者跟读的慢速

let cachedVoice: SpeechSynthesisVoice | null = null

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null // 语音列表还没异步加载完
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
  rate?: number // 默认 0.75
  lang?: string
}

function applyVoice(u: SpeechSynthesisUtterance, lang?: string) {
  const voice = pickVoice()
  if (voice) u.voice = voice
  u.lang = lang ?? voice?.lang ?? 'en-US'
}

/** 播放前先 cancel，防止多段语音叠在一起 */
export function speak(text: string, opts: SpeakOptions = {}) {
  if (!supported || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  applyVoice(u, opts.lang)
  u.rate = opts.rate ?? DEFAULT_RATE
  window.speechSynthesis.speak(u)
}

export function speakWord(word: string) {
  speak(word, { rate: DEFAULT_RATE })
}

export function speakLetter(letter: string) {
  speak(letter, { rate: DEFAULT_RATE })
}

/** 同一句话连读两遍（中间自然停顿） */
export function speakTwice(text: string, opts: SpeakOptions = {}) {
  speakSequence([{ text, ...opts }, { text, ...opts }])
}

// ---------------- 连续播放（2+2 跟读、连读模式都用它） ----------------

export interface SpeakItem extends SpeakOptions {
  text: string
  /** 本段播完后额外停顿的毫秒数（如「字母×2」与「例词×2」之间留间隔） */
  pauseAfter?: number
}

export interface SequenceOptions {
  /** 全部播完后的回调（连读模式用它自动跳下一个字母） */
  onDone?: () => void
}

let seqToken = 0 // 每次新序列自增，旧序列的回调全部作废
let seqTimer: ReturnType<typeof setTimeout> | null = null

function clearSeqTimer() {
  if (seqTimer !== null) {
    clearTimeout(seqTimer)
    seqTimer = null
  }
}

/** 停止一切发音（打断当前 speak / speakSequence） */
export function stopSpeaking() {
  seqToken += 1
  clearSeqTimer()
  if (supported) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // 忽略
    }
  }
}

/**
 * 顺序播放多段语音，段间可加停顿；播完触发 onDone。
 * 例：2+2 跟读 = 字母音×2 → 停 0.6s → 例词音×2。
 */
export function speakSequence(items: SpeakItem[], opts: SequenceOptions = {}) {
  if (!supported) return
  stopSpeaking()
  const token = seqToken
  let i = 0

  const next = () => {
    if (token !== seqToken) return // 已被新序列 / stopSpeaking 打断
    if (i >= items.length) {
      opts.onDone?.()
      return
    }
    const item = items[i++]
    if (!item.text) {
      next()
      return
    }
    try {
      const u = new SpeechSynthesisUtterance(item.text)
      applyVoice(u, item.lang)
      u.rate = item.rate ?? DEFAULT_RATE
      u.onend = () => {
        if (token !== seqToken) return
        if (item.pauseAfter) {
          seqTimer = setTimeout(next, item.pauseAfter)
        } else {
          // 交给下一次事件循环，给浏览器一点喘息，避免个别设备吞掉相邻 utterance
          seqTimer = setTimeout(next, 0)
        }
      }
      u.onerror = () => {
        if (token !== seqToken) return
        seqTimer = setTimeout(next, 0)
      }
      window.speechSynthesis.speak(u)
    } catch {
      // 单段失败不拖垮整个序列
      seqTimer = setTimeout(next, 0)
    }
  }
  next()
}

// 语音列表是异步加载的：提前触发一次加载，加载完成后清缓存重新挑选
if (supported) {
  try {
    window.speechSynthesis.getVoices()
    const refresh = () => {
      cachedVoice = null
      pickVoice()
    }
    window.speechSynthesis.onvoiceschanged = refresh
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh)
  } catch {
    // 忽略
  }
}
