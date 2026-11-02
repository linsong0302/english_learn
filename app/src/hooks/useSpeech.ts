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

/** 挑一个中文语音：联想汉字（诶诶 / 啵啵）要用中文读才像音标近似音 */
function pickZhVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  return (
    voices.find((v) => v.lang === 'zh-CN') ??
    voices.find((v) => v.lang.startsWith('zh')) ??
    null
  )
}

/** 所选音色的口诀录音地址（public/audio/chant/{voiceId}/） */
function chantUrl(voice: string, name: string): string {
  return `${import.meta.env.BASE_URL}audio/chant/${voice}/${name}.mp3`
}

/** 所选音色的英文单词录音地址（public/audio/word/{enDir}/） */
function wordUrl(enDir: string, word: string): string {
  return `${import.meta.env.BASE_URL}audio/word/${enDir}/${word}.mp3`
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
  // 数据里的词可能带中文注释（如「book（中的 oo）」），发音前去掉
  const w = word.replace(/（[^）]*）/g, '').trim().toLowerCase()
  if (!w) return
  stopSpeaking()
  const s = getChantSettings()
  const enDir = EN_VOICE_DIR[s.voice] ?? 'ana'
  playChantAudio(wordUrl(enDir, w)).then((ok) => {
    if (!ok) speak(w, { rate: DEFAULT_RATE }) // 没有录音时退回系统 TTS
  })
}

export function speakLetter(letter: string) {
  stopSpeaking()
  const voice = getChantSettings().voice
  playChantAudio(chantUrl(voice, `${letter.toLowerCase()}-zh`)).then((ok) => {
    if (!ok) speak(letter, { rate: DEFAULT_RATE })
  })
}

export interface LetterPhonemeOptions {
  /** 录音基础名（不含扩展名）：默认小写字母；l/m/n/r 词尾读法传 `${letter}-final`。
   *  对应整句 `${key}.mp3` 和音标 `${key}-hanzi.mp3`（都在所选音色的目录下）。 */
  key?: string
  /** 全部播完后的回调（连读模式用它自动跳下一个字母） */
  onDone?: () => void
}

/** 字母+音标跟读（口诀里的 2+2），按朗读设置用所选音色的录音播放：
 *  字母 → 字母间隔 → 字母 → 音标间隔 → 联想字，间隔精确到毫秒（0 = 紧挨着，
 *  如「BB啵啵」）；两根滑条组合可得到「B，B，啵啵」「BB，啵啵」等格式。录音缺失时退回系统 TTS。 */
export function speakLetterAndPhoneme(
  letter: string,
  hanzi: string,
  opts: LetterPhonemeOptions = {},
) {
  const { key = letter.toLowerCase(), onDone } = opts
  stopSpeaking()
  const token = seqToken // 之后每次 stopSpeaking 都会让本序列作废
  const s = getChantSettings()
  const low = letter.toLowerCase()

  const alive = () => token === seqToken

  function ttsFallback() {
    speakSequence(
      [
        { text: letter, pauseAfter: s.letterGapMs },
        { text: letter, pauseAfter: s.phonemeGapMs },
        { text: hanzi, zh: true },
      ],
      { onDone },
    )
  }

  void (async () => {
    const ok = await playClipsPrecise(
      [
        { url: chantUrl(s.voice, `${low}-zh`), gapAfterMs: s.letterGapMs },
        { url: chantUrl(s.voice, `${low}-zh`), gapAfterMs: s.phonemeGapMs },
        { url: chantUrl(s.voice, `${key}-hanzi`), gapAfterMs: 0, splitGapMs: s.hanziGapMs },
      ],
      alive,
      onDone,
    )
    if (!alive()) return
    if (!ok) return ttsFallback()
  })()
}

/** 同一句话连读两遍（中间自然停顿） */
export function speakTwice(text: string, opts: SpeakOptions = {}) {
  speakSequence([{ text, ...opts }, { text, ...opts }])
}

export interface ComboSpeakOptions {
  /** 全部字母读完后的回调（规则页用它接着读第一个例词） */
  onDone?: () => void
}

/** 组合字母点读：如 "th（清）" → 依次读 T、H。
 *  音标符号（/θ/ 等）TTS 读不出来，改读组合由哪些字母组成；
 *  用所选音色的单字母录音按字母间隔串播，缺失时退回系统 TTS 逐字母读。 */
export function speakCombo(pattern: string, opts: ComboSpeakOptions = {}) {
  const letters = pattern
    .replace(/（[^）]*）/g, '') // 去掉中文注释，如 th（清）→ th
    .trim()
    .toLowerCase()
    .split('')
    .filter((ch) => ch >= 'a' && ch <= 'z')
  if (!letters.length) return
  stopSpeaking()
  const token = seqToken
  const s = getChantSettings()
  const alive = () => token === seqToken

  const ttsFallback = () =>
    speakSequence(
      letters.map((ch, i) => ({
        text: ch,
        pauseAfter: i < letters.length - 1 ? s.letterGapMs : 0,
      })),
      { onDone: opts.onDone },
    )

  void (async () => {
    const ok = await playClipsPrecise(
      letters.map((ch, i) => ({
        url: chantUrl(s.voice, `${ch}-zh`),
        gapAfterMs: i < letters.length - 1 ? s.letterGapMs : 0,
      })),
      alive,
      opts.onDone,
    )
    if (!alive()) return
    if (!ok) return ttsFallback()
  })()
}

/** 音标点读：播放预合成的音标本音录音（public/audio/phoneme/{audio}.mp3，
 *  用 scripts/gen-phoneme-audio.mjs 生成；音标符号无法直接 TTS）。
 *  录音缺失或加载失败时退回读 fallbackWord（例词），和音标总表原来的行为一致。 */
export function speakPhoneme(audio: string | undefined, fallbackWord?: string) {
  if (!audio) {
    if (fallbackWord) speakWord(fallbackWord)
    return
  }
  stopSpeaking()
  playChantAudio(`${import.meta.env.BASE_URL}audio/phoneme/${encodeURIComponent(audio)}.mp3`).then(
    (ok) => {
      if (!ok && fallbackWord) speakWord(fallbackWord)
    },
  )
}

// ---------------- 连续播放（2+2 跟读、连读模式都用它） ----------------

export interface SpeakItem extends SpeakOptions {
  text: string
  /** 本段播完后额外停顿的毫秒数（如「字母×2」与「例词×2」之间留间隔） */
  pauseAfter?: number
  /** 用中文语音朗读（联想汉字近似音标音时使用） */
  zh?: boolean
}

export interface SequenceOptions {
  /** 全部播完后的回调（连读模式用它自动跳下一个字母） */
  onDone?: () => void
}

let seqToken = 0 // 每次新序列自增，旧序列的回调全部作废
let seqTimer: ReturnType<typeof setTimeout> | null = null
let chantAudio: HTMLAudioElement | null = null // 正在播放的口诀录音

function clearSeqTimer() {
  if (seqTimer !== null) {
    clearTimeout(seqTimer)
    seqTimer = null
  }
}

/** 停止一切发音（打断当前 speak / speakSequence / 口诀录音 / Web Audio 精确连播） */
export function stopSpeaking() {
  seqToken += 1
  clearSeqTimer()
  activeSources.forEach((s) => {
    try {
      s.stop()
    } catch {
      // 忽略
    }
  })
  activeSources = []
  if (chantAudio) {
    try {
      chantAudio.pause()
      chantAudio.removeAttribute('src')
    } catch {
      // 忽略
    }
    chantAudio = null
  }
  if (supported) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // 忽略
    }
  }
}

// ---------------- 口诀录音（打包在 public/audio/chant） ----------------
// 字母是一条独立录音（英文童声），音标联想汉字是另一条（中文甜妹），
// 由代码按可调间隔串成「字母 → 字母 → 音标」，加载失败再退回系统 TTS。

/** 播放一个音频文件；正常播完 resolve(true)，加载/播放失败 resolve(false) */
function playChantAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const audio = new Audio(url)
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      if (chantAudio === audio) chantAudio = null
      if (!ok) {
        try {
          audio.pause()
          audio.removeAttribute('src')
        } catch {
          // 忽略
        }
      }
      resolve(ok)
    }
    audio.addEventListener('ended', () => finish(true))
    audio.addEventListener('error', () => finish(false))
    // 本地文件毫秒级加载；超时兜底，防止异常环境下卡住不发声
    setTimeout(() => finish(false), 4000)
    chantAudio = audio
    audio.play().catch(() => finish(false))
  })
}

// ---------------- Web Audio 精确连播（多段录音拼读用） ----------------
// 录音 mp3 的首尾带有 TTS 合成时留下的静音垫（单字母剪辑约 1.2 秒，实际读音约 0.4 秒），
// 直接连播即使间隔为 0 也分不开。这里把每段解码后裁掉首尾静音，再用 AudioContext
// 按毫秒精确排程：滑条设 0 秒就是真正紧挨着的「BB」，设多少停多少。

let audioCtx: AudioContext | null = null
const trimmedCache = new Map<string, AudioBuffer | null>() // null = 该地址解码失败，别再试
let activeSources: AudioBufferSourceNode[] = [] // 已排程的节点，stopSpeaking 时一并停掉

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {})
  return audioCtx
}

/** 裁掉首尾静音（阈值 0.012，两端各留 30ms 缓冲）；内容全静音等异常时原样返回 */
function trimSilence(buf: AudioBuffer, ctx: AudioContext): AudioBuffer {
  const ch = buf.getChannelData(0)
  const TH = 0.012
  const EDGE = Math.floor(buf.sampleRate * 0.03)
  let start = 0
  let end = ch.length - 1
  while (start < ch.length && Math.abs(ch[start]) < TH) start++
  while (end > start && Math.abs(ch[end]) < TH) end--
  if (start >= end) return buf
  start = Math.max(0, start - EDGE)
  end = Math.min(ch.length - 1, end + EDGE)
  const out = ctx.createBuffer(buf.numberOfChannels, end - start + 1, buf.sampleRate)
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.copyToChannel(buf.getChannelData(c).subarray(start, end + 1), c)
  }
  return out
}

/** 取裁好静音的剪辑（带缓存）；解码失败返回 null */
async function trimmedBuffer(url: string): Promise<AudioBuffer | null> {
  if (trimmedCache.has(url)) return trimmedCache.get(url)!
  const ctx = getAudioCtx()
  if (!ctx) {
    trimmedCache.set(url, null)
    return null
  }
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = trimSilence(await ctx.decodeAudioData(await res.arrayBuffer()), ctx)
    if (trimmedCache.size > 200) trimmedCache.clear()
    trimmedCache.set(url, buf)
    return buf
  } catch {
    trimmedCache.set(url, null)
    return null
  }
}

/** 把「啵啵」这类叠字录音从中点附近最安静的 20ms 窗切成两半（两端各留裁剪时的 30ms 缓冲）。
 *  中间没有明显停顿（峰值 > 0.08，连续发声）时返回 null，调用方整段照播，避免把字切破。 */
function splitDoubledClip(buf: AudioBuffer, ctx: AudioContext): [AudioBuffer, AudioBuffer] | null {
  const ch = buf.getChannelData(0)
  const sr = buf.sampleRate
  const win = Math.max(1, Math.floor(sr * 0.02))
  const from = Math.floor(ch.length * 0.3)
  const to = Math.min(ch.length, Math.floor(ch.length * 0.7) + win)
  let bestPos = -1
  let bestPeak = Infinity
  for (let p = from; p + win <= to; p += Math.floor(win / 2) || 1) {
    let peak = 0
    for (let i = p; i < p + win; i++) peak = Math.max(peak, Math.abs(ch[i]))
    if (peak < bestPeak) {
      bestPeak = peak
      bestPos = p + Math.floor(win / 2)
    }
  }
  if (bestPos <= 0 || bestPos >= ch.length || bestPeak > 0.08) return null
  const slice = (a: number, b: number) => {
    const out = ctx.createBuffer(buf.numberOfChannels, b - a, sr)
    for (let c = 0; c < buf.numberOfChannels; c++) {
      out.copyToChannel(buf.getChannelData(c).subarray(a, b), c)
    }
    return out
  }
  return [slice(0, bestPos), slice(bestPos, ch.length)]
}

/** 精确连播多段录音：段间隔 = gapAfterMs（0 = 两段紧挨着）。
 *  item 带 splitGapMs 时，会把该剪辑当中点附近有真停顿的叠字（如「啵啵」）切成两半，
 *  两半之间按 splitGapMs 排程；切不开就整段照播（splitGapMs 不生效）。
 *  返回 true = 已排程（或已被打断）；false = 任一剪辑解码失败，调用方退回 TTS。 */
async function playClipsPrecise(
  items: { url: string; gapAfterMs: number; splitGapMs?: number }[],
  alive: () => boolean,
  onDone?: () => void,
): Promise<boolean> {
  const ctx = getAudioCtx()
  if (!ctx) return false
  const bufs = await Promise.all(items.map((it) => trimmedBuffer(it.url)))
  if (!alive()) return true // 已被新的播放/停止打断，不用也不该退回 TTS
  if (bufs.some((b) => !b)) return false

  const segs: { buf: AudioBuffer; gapAfterMs: number }[] = []
  items.forEach((it, i) => {
    const b = bufs[i]!
    if (it.splitGapMs !== undefined) {
      const halves = splitDoubledClip(b, ctx)
      if (halves) {
        segs.push({ buf: halves[0], gapAfterMs: it.splitGapMs })
        segs.push({ buf: halves[1], gapAfterMs: it.gapAfterMs })
        return
      }
    }
    segs.push({ buf: b, gapAfterMs: it.gapAfterMs })
  })

  let t = ctx.currentTime + 0.06 // 留一点调度余量
  segs.forEach((seg) => {
    const src = ctx.createBufferSource()
    src.buffer = seg.buf
    src.connect(ctx.destination)
    src.onended = () => {
      activeSources = activeSources.filter((s) => s !== src)
    }
    src.start(t)
    activeSources.push(src)
    t += seg.buf.duration + seg.gapAfterMs / 1000
  })
  seqTimer = setTimeout(
    () => {
      if (alive()) onDone?.()
    },
    (t - ctx.currentTime) * 1000,
  )
  return true
}

// ---------------- 音色（全应用统一，口诀页/规则页可选择，存 localStorage） ----------------

export interface VoiceOption {
  id: string
  /** 按钮上的短名：甜妹 / 御姐… */
  label: string
  /** 全名：甜妹晓晓… */
  full: string
}

/** 预合成音频的音色（public/audio/chant/{id}/、public/audio/word/{en}/） */
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'sweet', label: '甜妹', full: '甜妹晓晓' },
  { id: 'lively', label: '活泼', full: '活泼小艺' },
  { id: 'cute', label: '萌娃', full: '萌娃云夏' },
  { id: 'sunny', label: '阳光', full: '阳光云希' },
  { id: 'calm', label: '沉稳', full: '沉稳云扬' },
  { id: 'hot', label: '热血', full: '热血云健' },
]

/** 各音色读英文单词用的录音目录（萌娃与甜妹共用英文童声 Ana） */
const EN_VOICE_DIR: Record<string, string> = {
  sweet: 'ana',
  lively: 'emma',
  cute: 'ana',
  sunny: 'brian',
  calm: 'christopher',
  hot: 'guy',
}

const VOICE_IDS = VOICE_OPTIONS.map((v) => v.id)

export function voiceFull(id: string): string {
  return VOICE_OPTIONS.find((v) => v.id === id)?.full ?? VOICE_OPTIONS[0].full
}

// ---------------- 朗读设置（口诀页可选，存 localStorage） ----------------

export interface ChantSettings {
  /** 音色 id（VOICE_OPTIONS 之一），全应用共用 */
  voice: string
  /** 两个字母之间的间隔（毫秒）：0 表示紧挨着不停顿 */
  letterGapMs: number
  /** 字母和音标之间的间隔（毫秒） */
  phonemeGapMs: number
  /** 联想叠字（如「啵啵」）两个字之间的间隔（毫秒）：0 = 自然连读 */
  hanziGapMs: number
}

const SETTINGS_KEY = 'kk-chant-settings-v3'
const GAP_MIN = 0
const GAP_MAX = 2000
export const DEFAULT_CHANT_SETTINGS: ChantSettings = {
  voice: 'sweet',
  letterGapMs: 250,
  phonemeGapMs: 350,
  hanziGapMs: 0,
}

function clampGap(n: unknown, fallback: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return fallback
  return Math.min(GAP_MAX, Math.max(GAP_MIN, v))
}

export function getChantSettings(): ChantSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_CHANT_SETTINGS }
    const p = JSON.parse(raw) as Partial<ChantSettings>
    return {
      voice: VOICE_IDS.includes(p.voice as string) ? (p.voice as string) : DEFAULT_CHANT_SETTINGS.voice,
      letterGapMs: clampGap(p.letterGapMs, DEFAULT_CHANT_SETTINGS.letterGapMs),
      phonemeGapMs: clampGap(p.phonemeGapMs, DEFAULT_CHANT_SETTINGS.phonemeGapMs),
      hanziGapMs: clampGap(p.hanziGapMs, DEFAULT_CHANT_SETTINGS.hanziGapMs),
    }
  } catch {
    return { ...DEFAULT_CHANT_SETTINGS }
  }
}

export function setChantSettings(s: ChantSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // 存储不可用时静默忽略
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
      if (item.zh) {
        const zhVoice = pickZhVoice()
        if (zhVoice) u.voice = zhVoice
        u.lang = zhVoice?.lang ?? 'zh-CN'
      } else {
        applyVoice(u, item.lang)
      }
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
