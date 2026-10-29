import { useEffect, useRef, useState } from 'react'
import { speakWord, stopSpeaking } from '../hooks/useSpeech'

interface Props {
  upper: string // 示范用的字母（读字母音）
  sample: string // 示范用的例词
}

type Stage = 'idle' | 'recording' | 'recorded' | 'denied'

/** 跟读对比：录下自己的朗读并回放，与 TTS 示范并排。
 *  设备不支持录音 / 无麦克风权限时整块隐藏（优雅降级）。 */
export default function EchoCompare({ upper, sample }: Props) {
  const canRecord =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const [stage, setStage] = useState<Stage>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  // 卸载：停止录音、暂停回放、释放资源
  useEffect(() => {
    return () => {
      try {
        if (recRef.current?.state === 'recording') recRef.current.stop()
      } catch {
        // 忽略
      }
      audioRef.current?.pause()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  if (!canRecord || stage === 'denied') return null

  const start = async () => {
    stopSpeaking() // 录音前停掉示范音
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()) // 释放麦克风
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setAudioUrl(url)
        setStage('recorded')
      }
      recRef.current = rec
      rec.start()
      setStage('recording')
    } catch {
      setStage('denied') // 无权限 / 录音失败：整块隐藏
    }
  }

  const stop = () => {
    try {
      recRef.current?.stop()
    } catch {
      // 忽略
    }
  }

  const playMine = () => {
    if (!audioUrl) return
    stopSpeaking()
    if (!audioRef.current) audioRef.current = new Audio(audioUrl)
    else audioRef.current.src = audioUrl
    audioRef.current.play().catch(() => {})
  }

  return (
    <div className="echo-sec">
      <p className="card-title">跟读对比</p>
      <p className="echo-note">先听示范，再录下自己的读音，播放出来比一比。</p>
      <div className="echo-btns">
        <button className="btn-speak" onClick={() => speakWord(sample)}>
          听示范：{sample}
        </button>
        {stage === 'recording' ? (
          <button className="btn echo-rec-btn" onClick={stop}>
            ● 停止录音
          </button>
        ) : (
          <button className="btn btn-primary" onClick={start}>
            {stage === 'recorded' ? '重录我的' : '录我的'}
          </button>
        )}
      </div>
      {stage === 'recorded' && (
        <div className="echo-btns">
          <button className="btn btn-warm" onClick={playMine}>
            回放我的
          </button>
          <span className="echo-tip">读得像不像？多来几遍更好。</span>
        </div>
      )}
      {stage === 'recording' && (
        <p className="echo-note echo-live">
          正在录音，请大声读「{upper}」和「{sample}」，读完点停止。
        </p>
      )}
    </div>
  )
}
