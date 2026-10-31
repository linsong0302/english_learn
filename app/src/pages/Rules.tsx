import { useMemo, useState } from 'react'
import rulesData from '../data/rules.json'
import wordsData from '../data/words.json'
import { speakCombo, speakWord } from '../hooks/useSpeech'
import VoicePicker from '../components/VoicePicker'
import type { PronRule, Word } from '../types'
import './rules.css'

// JSON 用契约类型断言；lane1 可能中途给 JSON 增字段，读取一律可选链 + 默认值兜底
const RULES = rulesData as unknown as PronRule[]
const WORDS = wordsData as unknown as Word[]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 每条规则的小测验题：选择 / 判断，本地即时判分 */
interface MiniQ {
  kind: 'choice' | 'judge'
  prompt: string
  word: string // 可点读的词（可为空）
  options: string[]
  answerIndex: number
  explain: string
}

/** 干扰词：优先「都不用规则」的词，再取其他规则的词 */
function pickDistractorWords(excludeWord: string, ruleId: string, n: number): Word[] {
  const none = shuffle(WORDS.filter((w) => w.rule === 'none' && w.word !== excludeWord))
  const other = shuffle(
    WORDS.filter((w) => w.rule !== ruleId && w.rule !== 'none' && w.word !== excludeWord),
  )
  return [...none, ...other].slice(0, n)
}

function buildMiniQuiz(rule: PronRule): MiniQ[] {
  const qs: MiniQ[] = []
  const ruleWords = WORDS.filter((w) => w.rule === rule.id)

  // 第 1 题（选择）：哪个词用到了这条规则
  const hit = shuffle(ruleWords)[0]
  if (hit) {
    const opts = shuffle([hit, ...pickDistractorWords(hit.word, rule.id, 3)].map((w) => w.word))
    qs.push({
      kind: 'choice',
      prompt: '下面哪个单词用到了这条规则？',
      word: '',
      options: opts,
      answerIndex: opts.indexOf(hit.word),
      explain: `${hit.word} ${hit.kk}，它符合本条规则`,
    })
  }

  // 第 2 题（判断）：这个词用到了这条规则吗
  const judgeWord = shuffle(WORDS)[0]
  if (judgeWord) {
    const yes = judgeWord.rule === rule.id
    qs.push({
      kind: 'judge',
      prompt: `「${judgeWord.word}」用到了这条规则吗？`,
      word: judgeWord.word,
      options: ['对', '错'],
      answerIndex: yes ? 0 : 1,
      explain: `${judgeWord.word} ${judgeWord.kk}${yes ? '，符合本条规则' : '，不属于本条规则'}`,
    })
  }

  // 第 3 题（选择）：规则 5 用组合表里的组合读音；其余用例词选音标
  if (rule.id === 'rule5' && rule.combos?.length) {
    const flat = rule.combos.flatMap((c) =>
      (c.examples ?? []).map((e) => ({ word: e.word, kk: e.kk, pattern: c.pattern, ck: c.kk })),
    )
    const pick1 = shuffle(flat)[0]
    if (pick1) {
      const ds = shuffle(rule.combos.filter((c) => c.kk !== pick1.ck))
        .slice(0, 3)
        .map((c) => c.kk)
      const opts = shuffle([pick1.ck, ...ds])
      qs.push({
        kind: 'choice',
        prompt: `「${pick1.word}」里的 ${pick1.pattern} 读什么音？`,
        word: pick1.word,
        options: opts,
        answerIndex: opts.indexOf(pick1.ck),
        explain: `${pick1.word} ${pick1.kk}，${pick1.pattern} 读 ${pick1.ck}`,
      })
    }
  } else {
    const ex = shuffle(rule.examples ?? [])[0]
    if (ex) {
      const ds = shuffle(WORDS.filter((w) => w.kk !== ex.kk))
        .slice(0, 3)
        .map((w) => w.kk)
      const opts = shuffle([ex.kk, ...ds])
      qs.push({
        kind: 'choice',
        prompt: `单词「${ex.word}」的音标是？`,
        word: ex.word,
        options: opts,
        answerIndex: opts.indexOf(ex.kk),
        explain: `${ex.word} ${ex.kk}（${ex.note}）`,
      })
    }
  }

  return qs
}

/** 单条规则的小测验组件：展开时生成题目，答完即时给分，可重做 */
function RuleQuiz({ rule }: { rule: PronRule }) {
  const [nonce, setNonce] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const questions = useMemo(() => buildMiniQuiz(rule), [rule, nonce])

  const answered = answers.filter((a) => a !== null).length
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.answerIndex ? 1 : 0), 0)
  const done = questions.length > 0 && answered === questions.length

  function restart() {
    setNonce((n) => n + 1)
    setAnswers([])
  }

  return (
    <div className="rule-quiz">
      <div className="rq-head">小测验 · 共 {questions.length} 题</div>
      {questions.map((q, qi) => {
        const picked = answers[qi]
        return (
          <div className="rq-q" key={qi}>
            <p className="rq-prompt">
              <span>
                {qi + 1}. {q.prompt}
              </span>
              {q.word && (
                <button
                  className="rq-say"
                  onClick={() => speakWord(q.word)}
                  aria-label={`读 ${q.word}`}
                >
                  🔊
                </button>
              )}
            </p>
            <div className="rq-opts">
              {q.options.map((op, oi) => {
                const cls =
                  picked == null
                    ? ''
                    : oi === q.answerIndex
                      ? ' right'
                      : picked === oi
                        ? ' wrong'
                        : ''
                return (
                  <button
                    key={oi}
                    className={'rq-opt' + cls}
                    disabled={picked != null}
                    onClick={() =>
                      setAnswers((a) => {
                        const c = [...a]
                        c[qi] = oi
                        return c
                      })
                    }
                  >
                    {op}
                  </button>
                )
              })}
            </div>
            {picked != null && (
              <p className={'rq-fb ' + (picked === q.answerIndex ? 'ok' : 'bad')}>
                {picked === q.answerIndex ? '答对啦！' : `正确答案：${q.options[q.answerIndex]}。`}
                {q.explain}
              </p>
            )}
          </div>
        )
      })}
      {done && (
        <div className="rq-score">
          <span>
            得分 {score} / {questions.length}
            {score === questions.length ? '，太棒了！' : '，再读几遍例词吧。'}
          </span>
          <button className="btn-speak" onClick={restart}>
            再来一次
          </button>
        </div>
      )}
    </div>
  )
}

// lane3 负责的规则页：五大规则课程卡、例词点读、组合表、小测验
export default function Rules() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="page">
      <h1>五大规则</h1>
      <p className="rules-intro">100 个生词这样拆：90 个靠口诀，5 个靠规则，5 个靠排除。</p>
      <VoicePicker />
      {RULES.map((r) => (
        <div className="card rule-card" key={r.id}>
          <div className="rule-title">{r.title}</div>
          <p className="rule-summary">{r.summary}</p>
          <p className="rule-detail">{r.detail}</p>
          {r.mnemonic && <p className="rule-mnemonic">口诀：{r.mnemonic}</p>}

          {r.id === 'rule5' && r.combos?.length ? (
            <div className="combo-table">
              {r.combos.map((c) => (
                <div className="combo-row" key={c.pattern}>
                  <div className="combo-left">
                    <div className="combo-pat">
                      <b>{c.pattern}</b>
                      <button
                        className="btn-speak btn-speak-sm"
                        onClick={() => {
                          const first = (c.examples ?? [])[0]?.word
                          speakCombo(c.pattern, first ? { onDone: () => speakWord(first) } : undefined)
                        }}
                        aria-label={`读 ${c.pattern}`}
                      >
                        🔊
                      </button>
                    </div>
                    <span className="combo-kk">{c.kk}</span>
                  </div>
                  <div className="combo-right">
                    <div className="combo-words">
                      {(c.examples ?? []).map((e) => (
                        <button
                          key={e.word}
                          className="combo-word"
                          onClick={() => speakWord(e.word)}
                          title="点击听发音"
                        >
                          {e.word} <i>{e.kk}</i>
                        </button>
                      ))}
                    </div>
                    <span className="combo-note">{c.note}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rule-examples">
              {(r.examples ?? []).map((ex) => (
                <div className="rule-example" key={ex.word}>
                  <button
                    className="ex-speak"
                    onClick={() => speakWord(ex.word)}
                    aria-label={`读 ${ex.word}`}
                  >
                    ▶
                  </button>
                  <b className="ex-word">{ex.word}</b>
                  <span className="ex-kk">{ex.kk}</span>
                  <span className="ex-note">{ex.note}</span>
                </div>
              ))}
            </div>
          )}

          {!!r.mouthTips?.length && (
            <p className="rule-detail">口型要点：{r.mouthTips.join('；')}</p>
          )}
          {!!r.commonMistakes?.length && (
            <p className="rule-detail">常见错误：{r.commonMistakes.join('；')}</p>
          )}

          <button
            className="rule-quiz-toggle"
            onClick={() => setOpenId(openId === r.id ? null : r.id)}
          >
            {openId === r.id ? '收起小测验 ▲' : '来个小测验 ▼'}
          </button>
          {openId === r.id && <RuleQuiz rule={r} />}
        </div>
      ))}
    </div>
  )
}
