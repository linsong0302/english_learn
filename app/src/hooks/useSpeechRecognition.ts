// 语音识别封装（lane6 所有）：Web Speech Recognition 的最小类型声明 + React Hook。
// 仅负责「听」：给跟读打分页提供 开始 / 停止 / 结果 / 错误。
// 发音（示范朗读）一律走 src/hooks/useSpeech.ts，本文件不碰 speechSynthesis。

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------- 最小类型声明（TypeScript 内置类型库没有 SpeechRecognition） ----------

interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  // 用类型断言读取，避免与各浏览器 / TS 版本的内置声明冲突
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ---------- 错误文案（面向小朋友的友好提示） ----------

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝，请在浏览器地址栏允许使用麦克风',
  'service-not-allowed': '麦克风权限被拒绝，请在浏览器地址栏允许使用麦克风',
  'no-speech': '没听到声音，再试一次',
  network: '语音服务不可用，请检查网络后再试',
  'audio-capture': '没有检测到麦克风设备，请检查后再试',
  'language-not-supported': '当前浏览器不支持英语识别',
}

function errorMessage(code: string): string {
  return ERROR_TEXT[code] ?? '识别出了点小问题，请再试一次'
}

// ---------- 对外类型 ----------

/** 一次识别的结果（含中间结果；alternatives 供打分取最优匹配） */
export interface EchoRecognitionResult {
  /** 当前最优识别文本（中间结果会不断更新） */
  text: string
  /** 全部备选文本（含 text 自身），打分时逐个比对取最高分 */
  alternatives: string[]
  /** 是否已出最终结果 */
  final: boolean
}

export interface UseSpeechRecognitionReturn {
  /** 当前浏览器是否支持语音识别 */
  supported: boolean
  /** 是否正在监听麦克风 */
  listening: boolean
  /** 最近一次识别结果；start 时清空 */
  result: EchoRecognitionResult | null
  /** 识别失败的中文提示；成功为 null */
  error: string | null
  /** 开始听（重复调用安全） */
  start: () => void
  /** 主动停止并等待最终结果 */
  stop: () => void
  /** 清空结果与错误 */
  reset: () => void
}

// ---------- Hook ----------

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const listeningRef = useRef(false)
  const [supported] = useState<boolean>(() => getRecognitionCtor() !== null)
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState<EchoRecognitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setListeningSafe = useCallback((on: boolean) => {
    listeningRef.current = on
    setListening(on)
  }, [])

  const start = useCallback(() => {
    if (!supported || listeningRef.current) return
    setError(null)
    setResult(null)
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    try {
      const rec = new Ctor()
      rec.lang = 'en-US'
      rec.continuous = false // 说完一句自动结束，方便立即打分
      rec.interimResults = true // 中间结果也回传，识别中可以实时显示
      rec.maxAlternatives = 3 // 备选也给到打分逻辑，取最优匹配
      rec.onstart = () => setListeningSafe(true)
      rec.onresult = (e) => {
        // 只取最新一段结果（单轮模式下也只有一段）
        const last = e.results[e.results.length - 1]
        if (!last) return
        const alts: string[] = []
        for (let i = 0; i < last.length; i++) {
          const t = last[i]?.transcript?.trim()
          if (t && !alts.includes(t)) alts.push(t)
        }
        if (!alts.length) return
        setResult({ text: alts[0], alternatives: alts, final: last.isFinal })
      }
      rec.onerror = (e) => {
        if (e.error === 'aborted') return // 主动 abort 不算错误
        setError(errorMessage(e.error))
      }
      rec.onend = () => setListeningSafe(false)
      recRef.current = rec
      rec.start()
    } catch {
      // 某些浏览器在无权限 / 频繁调用时 start 会直接抛错
      setError('无法启动语音识别，请稍后再试')
      setListeningSafe(false)
    }
  }, [supported, setListeningSafe])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    try {
      rec.stop() // 正常结束，仍会给出最终结果
    } catch {
      // 忽略
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  // 组件卸载：清掉回调再 abort，防止识别进程残留
  useEffect(() => {
    return () => {
      const rec = recRef.current
      recRef.current = null
      if (rec) {
        rec.onstart = null
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try {
          rec.abort()
        } catch {
          // 忽略
        }
      }
      listeningRef.current = false
    }
  }, [])

  return { supported, listening, result, error, start, stop, reset }
}
