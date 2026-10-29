import { useEffect, useState } from 'react'
import { generateRound, KIND_LABEL, ruleLabel } from '../lib/quiz'
import type { QuizQuestion, QuizType } from '../lib/quiz'
import { addWrongWord, loadProgress, recordQuizRound } from '../store'
import type { QuizRound } from '../store'
import { speakWord } from '../hooks/useSpeech'
import './quiz.css'

const TYPE_OPTIONS: { key: QuizType; label: string; desc: string }[] = [
  { key: 'seeKk', label: '看词选音标', desc: '看单词，选出正确的 KK 音标' },
  { key: 'hearWord', label: '听音选词', desc: '听发音，选出你听到的单词' },
  { key: 'judgeRule', label: '判断规则', desc: '这个词用到了哪条规则' },
  { key: 'mixed', label: '混合模式', desc: '三种题型随机混着来' },
]

const ROUND_COUNT = 10

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function resultMsg(score: number, total: number): string {
  if (score === total) return '满分！你的耳朵和嘴巴都很厉害！'
  if (score >= total * 0.8) return '很棒！再读几遍错词就更好了。'
  if (score >= total * 0.6) return '不错哦！把错题多读几遍，再来一轮。'
  return '别灰心，先去规则页读读例词，再回来挑战！'
}

// lane3 负责的练习页：题型选择 → 答题交互（即时反馈 + 发音回放）→ 结算
export default function Quiz() {
  const [phase, setPhase] = useState<'pick' | 'play' | 'result'>('pick')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [lastType, setLastType] = useState<QuizType>('mixed')
  const [history, setHistory] = useState<QuizRound[]>([])

  const q = questions[qIndex]
  const score = results.filter(Boolean).length

  function start(type: QuizType) {
    setLastType(type)
    setQuestions(generateRound({ type, count: ROUND_COUNT }))
    setQIndex(0)
    setPicked(null)
    setResults([])
    setPhase('play')
  }

  // 听音题：进入新题自动播放一次
  useEffect(() => {
    if (phase === 'play' && q?.kind === 'hearWord') {
      speakWord(q.word)
    }
  }, [phase, qIndex, q])

  function choose(oi: number) {
    if (picked != null || !q) return
    setPicked(oi)
    setResults((r) => [...r, oi === q.answerIndex])
    // 发音回放：无论对错，答完都听一遍正确发音
    speakWord(q.word)
  }

  function next() {
    if (qIndex + 1 >= questions.length) {
      // 持久化（每轮只在这里记一次）：成绩进历史，错词进错题本
      recordQuizRound(score, questions.length)
      questions
        .filter((_, i) => !results[i])
        .forEach((w) => addWrongWord(w.word, w.kk))
      setHistory(loadProgress().quizRounds.slice(-5).reverse())
      setPhase('result')
    } else {
      setQIndex((i) => i + 1)
      setPicked(null)
    }
  }

  // —— 题型选择 ——
  if (phase === 'pick') {
    return (
      <div className="page">
        <h1>练习</h1>
        <p className="quiz-intro">每轮 {ROUND_COUNT} 题，答错的词会自动收进错题本。</p>
        <div className="type-grid">
          {TYPE_OPTIONS.map((t) => (
            <button key={t.key} className="type-btn" onClick={() => start(t.key)}>
              <b>{t.label}</b>
              <span>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // —— 结算 ——
  if (phase === 'result') {
    const wrongList = questions.filter((_, i) => !results[i])
    return (
      <div className="page">
        <h1>本轮成绩</h1>
        <div className="card">
          <p className="result-score">
            <b>
              {score}
              <span style={{ fontSize: 20, color: 'var(--sub)' }}> / {questions.length}</span>
            </b>
          </p>
          <p className="result-msg">{resultMsg(score, questions.length)}</p>

          {wrongList.length ? (
            <>
              <p className="wrong-title">错题回看（点 🔊 再听一遍）</p>
              {wrongList.map((w) => (
                <div className="wrong-item" key={w.word}>
                  <button
                    className="rq-say"
                    onClick={() => speakWord(w.word)}
                    aria-label={`读 ${w.word}`}
                  >
                    🔊
                  </button>
                  <b className="wrong-word">{w.word}</b>
                  <span className="wrong-kk">{w.kk}</span>
                  <span className="wrong-rule">{ruleLabel(w.rule)}</span>
                </div>
              ))}
            </>
          ) : (
            <p className="no-wrong">全对！没有错题，继续保持！</p>
          )}

          {history.length > 0 && (
            <>
              <p className="wrong-title" style={{ marginTop: 14 }}>
                最近 {history.length} 轮成绩
              </p>
              {history.map((h, i) => (
                <div className="wrong-item" key={`${h.date}-${i}`}>
                  <span className="hist-date">{fmtDate(h.date)}</span>
                  <b className="hist-score">
                    {h.score}/{h.total}
                  </b>
                  <span className="wrong-rule">
                    正确率 {Math.round((h.score / Math.max(1, h.total)) * 100)}%
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="result-actions">
            <button className="btn-again" onClick={() => start(lastType)}>
              再来一轮
            </button>
            <button className="btn-switch" onClick={() => setPhase('pick')}>
              换个题型
            </button>
          </div>
        </div>
      </div>
    )
  }

  // —— 答题 ——
  if (!q) return null
  const isHear = q.kind === 'hearWord'
  const optionCls = (oi: number) =>
    picked == null
      ? q.kind === 'seeKk'
        ? ' kk'
        : ''
      : oi === q.answerIndex
        ? ' right'
        : picked === oi
          ? ' wrong'
          : ''

  return (
    <div className="page">
      <h1>练习</h1>
      <div className="card">
        <div className="quiz-progress">
          <span className="quiz-count">
            第 {qIndex + 1} / {questions.length} 题
          </span>
          <div className="quiz-bar">
            <i style={{ width: `${((qIndex + (picked != null ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
        </div>
        <span className="kind-badge">{KIND_LABEL[q.kind]}</span>

        {isHear ? (
          <div className="q-hear">
            <button onClick={() => speakWord(q.word)} aria-label="再听一遍">
              🔊
            </button>
            <p>听发音，选出你听到的单词{picked != null ? '' : '（可点击重播）'}</p>
          </div>
        ) : (
          <p className="q-word">{q.word}</p>
        )}

        <div className="q-opts">
          {q.options.map((op, oi) => (
            <button
              key={oi}
              className={'q-opt' + (q.kind === 'seeKk' ? ' kk' : '') + optionCls(oi)}
              disabled={picked != null}
              onClick={() => choose(oi)}
            >
              {op}
            </button>
          ))}
        </div>

        {picked != null && (
          <div className={'q-feedback ' + (picked === q.answerIndex ? 'ok' : 'bad')}>
            <div className="q-fb-line">
              <b>{picked === q.answerIndex ? '答对啦！' : '答错了，正确答案已标绿。'}</b>
              <button className="q-fb-say" onClick={() => speakWord(q.word)}>
                🔊 发音回放
              </button>
            </div>
            <span>
              {q.word} {q.kk} · {ruleLabel(q.rule)}
            </span>
          </div>
        )}

        {picked != null && (
          <button className="q-next" onClick={next}>
            {qIndex + 1 >= questions.length ? '看成绩' : '下一题'}
          </button>
        )}
      </div>
    </div>
  )
}
