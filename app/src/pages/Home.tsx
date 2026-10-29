import { useState } from 'react'
import letters from '../data/letters.json'
import rules from '../data/rules.json'
import words from '../data/words.json'
import { loadProgress, streakDays, todayCheckin, toggleCheckin } from '../store'
import './home.css'

// lane2 首页：今日任务卡、学习进度总览、四大板块入口、课程理念卡。

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深啦，早点休息'
  if (h < 11) return '早上好，来读口诀吧'
  if (h < 14) return '中午好，读两句热热身'
  if (h < 19) return '下午好，继续加油'
  return '晚上好，睡前读一读'
}

/** 练习正确率：所有轮次累计得分 / 累计题数 */
function quizAccuracy(): string {
  const rounds = loadProgress().quizRounds
  const total = rounds.reduce((s, r) => s + r.total, 0)
  const score = rounds.reduce((s, r) => s + r.score, 0)
  if (total === 0) return '—'
  return `${Math.round((score / total) * 100)}%`
}

const ENTRIES = [
  {
    name: '字母口诀', tab: '口诀', color: '#ffb020', char: '诀',
    desc: '26 个字母 + KK 音标 + 联想汉字，一个口诀记牢',
    where: '点底部「口诀」开始',
  },
  {
    name: '五个规则', tab: '规则', color: '#2f6df6', char: '规',
    desc: '词尾 e、元音 + r、oo、au/ow、辅音组合',
    where: '点底部「规则」学习',
  },
  {
    name: '每日一测', tab: '练习', color: '#2eaf6a', char: '测',
    desc: '看词选音标、听音选词、判断规则，错题自动进错题本',
    where: '点底部「练习」开测',
  },
  {
    name: '打卡复习', tab: '复习', color: '#e25555', char: '复',
    desc: '早晚打卡、14 天日历、错题本、KK/IPA 对照',
    where: '点底部「复习」查看',
  },
]

export default function Home() {
  const [checkin, setCheckin] = useState(() => todayCheckin())
  const seen = loadProgress().seenLetters.length
  const streak = streakDays()

  const onToggle = (slot: 'am' | 'pm') => {
    setCheckin((c) => ({ ...c, [slot]: toggleCheckin(slot) }))
  }

  return (
    <div className="page">
      <h1>KK 音标学习</h1>
      <p className="home-greet">{greeting()}！一个口诀 + 五个规则，生词轻松拆。</p>

      {/* 今日任务卡：早晚朗读打卡 */}
      <section className="card">
        <p className="card-title">今日任务 · 早晚朗读</p>
        <div className="home-checkin">
          <button
            className={`btn ${checkin.am ? 'done' : 'todo'}`}
            onClick={() => onToggle('am')}
          >
            {checkin.am ? '早读打卡 ✓' : '早读打卡'}
            <small>{checkin.am ? '读得真棒！' : '口诀读 3 遍'}</small>
          </button>
          <button
            className={`btn ${checkin.pm ? 'done' : 'todo'}`}
            onClick={() => onToggle('pm')}
          >
            {checkin.pm ? '晚读打卡 ✓' : '晚读打卡'}
            <small>{checkin.pm ? '又是充实一天！' : '口诀读 3 遍'}</small>
          </button>
        </div>
        <p className="card-hint">
          同一内容至少读 20 遍才牢：早晚各读 3 遍口诀，读完点这里打卡。
          打卡记录和连续天数到「复习」页查看。
        </p>
      </section>

      {/* 学习进度总览 */}
      <section className="card">
        <p className="card-title">我的进度</p>
        <div className="home-stats">
          <div className="home-stat">
            <b>{seen}/26</b>
            <span>已学口诀</span>
          </div>
          <div className="home-stat">
            <b>{quizAccuracy()}</b>
            <span>练习正确率</span>
          </div>
          <div className="home-stat">
            <b>{streak}</b>
            <span>连续打卡（天）</span>
          </div>
        </div>
        {seen < 26 && (
          <p className="card-hint">
            口诀先辅音骨架、后元音血肉：先读 b / p / m / f，再读 a / e / i / o / u。
          </p>
        )}
      </section>

      {/* 四大板块入口 */}
      <section>
        <h2>四大板块</h2>
        <div className="home-grid">
          {ENTRIES.map((e) => (
            <div className="home-entry" key={e.name}>
              <div className="home-entry-ic" style={{ background: e.color }}>
                {e.char}
              </div>
              <b>{e.name}</b>
              <p>{e.desc}</p>
              <span className="where">{e.where}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 课程理念卡 */}
      <section className="card home-idea">
        <p className="card-title">课程理念</p>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          100 个生词这样拆——
        </p>
        <div className="home-formula">
          <div>
            <span className="num" style={{ background: 'var(--brand)' }}>90</span>
            <span className="cap">靠口诀</span>
          </div>
          <span className="home-eq">+</span>
          <div>
            <span className="num" style={{ background: 'var(--accent)' }}>5</span>
            <span className="cap">靠规则</span>
          </div>
          <span className="home-eq">+</span>
          <div>
            <span className="num" style={{ background: 'var(--ok)' }}>5</span>
            <span className="cap">靠排除</span>
          </div>
          <span className="home-eq">=</span>
          <div>
            <span className="num" style={{ background: 'var(--ink)' }}>100</span>
            <span className="cap">个生词</span>
          </div>
        </div>
        <ul className="home-idea-tips">
          <li>先把 26 个字母口诀读熟，90 分就到手了</li>
          <li>再用 5 个规则拿下难词，最后用排除法收尾</li>
          <li>先简单后困难：先辅音骨架，后元音血肉</li>
          <li>内容规模：{letters.length} 个字母口诀 · {rules.length} 条规则 · {words.length} 个练习词</li>
        </ul>
      </section>
    </div>
  )
}
