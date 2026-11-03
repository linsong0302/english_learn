import { useState } from 'react'
import letters from '../data/letters.json'
import rules from '../data/rules.json'
import words from '../data/words.json'
import planData from '../data/plan.json'
import type { PlanDay } from '../types-plan'
import { getPlanState, loadProgress, streakDays, todayCheckin, toggleCheckin } from '../store'
import { speakSequence } from '../hooks/useSpeech'
import './home.css'
import './plan.css'

// lane2 首页：今日任务卡、学习进度总览、四大板块入口、课程理念卡。
// lane7 增量：四大板块之后加「七天计划」入口卡（样式在 plan.css）。

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深啦，早点休息'
  if (h < 11) return '早上好，来读口诀吧'
  if (h < 14) return '中午好，读两句热热身'
  if (h < 19) return '下午好，继续加油'
  return '晚上好，睡前读一读'
}

/** 七天计划：按开始日期推算今天进行到第几天（1-7） */
function planCurrentDay(startedAt: number): number {
  const start = new Date(startedAt)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.max(diff + 1, 1), 7)
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
    name: '字母口诀', tab: '口诀', go: 'chant', color: '#ffb020', char: '诀',
    desc: '26 个字母 + KK 音标 + 联想汉字，一个口诀记牢',
    where: '点卡片直接开始',
  },
  {
    name: '五个规则', tab: '规则', go: 'rules', color: '#2f6df6', char: '规',
    desc: '词尾 e、元音 + r、oo、au/ow、辅音组合',
    where: '点卡片直接学习',
  },
  {
    name: '英文阅读', tab: '阅读', go: 'reading', color: '#58c1a8', char: '读',
    desc: '分级短文 + 粘贴文章：点句朗读、点词查义、自动翻译',
    where: '点卡片直接开读',
  },
  {
    name: '写作教练', tab: '写作', go: 'writing', color: '#9a6df0', char: '写',
    desc: '写作模板 + 常用句式，跟着结构一步一步仿写',
    where: '点卡片直接动笔',
  },
  {
    name: '每日一测', tab: '练习', go: 'quiz', color: '#2eaf6a', char: '测',
    desc: '看词选音标、听音选词、判断规则，错题自动进错题本',
    where: '点卡片直接开测',
  },
  {
    name: '打卡复习', tab: '复习', go: 'review', color: '#e25555', char: '复',
    desc: '早晚打卡、14 天日历、错题本、KK/IPA 对照',
    where: '点卡片直接查看',
  },
]

// lane7：七天计划入口状态
const PLAN_DAYS = planData as unknown as PlanDay[]

// lane2 美化批次：每日一句（按一年中的第几天轮换，全部为常用谚语/鼓励句）
const DAILY_SENTENCES = [
  { en: 'Practice makes perfect.', cn: '熟能生巧。' },
  { en: 'Every day is a new start.', cn: '每一天都是新的开始。' },
  { en: 'Little by little, one goes far.', cn: '一步一步，就能走得很远。' },
  { en: 'Reading makes a full person.', cn: '阅读使人充实。' },
  { en: 'A good beginning is half done.', cn: '好的开始是成功的一半。' },
  { en: 'Never give up, and you will make it.', cn: '永不放弃，你就能做到。' },
  { en: 'The early bird catches the worm.', cn: '早起的鸟儿有虫吃。' },
  { en: 'Learn something new every day.', cn: '每天学一点新东西。' },
  { en: 'Mistakes help us grow.', cn: '错误帮助我们成长。' },
  { en: 'Where there is a will, there is a way.', cn: '有志者，事竟成。' },
  { en: 'Do small things with great love.', cn: '用爱做好每件小事。' },
  { en: 'Keep calm and keep learning.', cn: '保持冷静，继续学习。' },
  { en: 'Action speaks louder than words.', cn: '行动胜过言语。' },
  { en: "Today's work, tomorrow's success.", cn: '今天的努力，明天的成功。' },
  { en: 'A happy heart makes a bright day.', cn: '好心情带来明亮的一天。' },
  { en: 'Slow and steady wins the race.', cn: '稳扎稳打，就能赢。' },
]

export default function Home() {
  const [checkin, setCheckin] = useState(() => todayCheckin())
  const seen = loadProgress().seenLetters.length
  const streak = streakDays()

  const planState = getPlanState()
  const planStarted = planState.startedAt != null
  const planDay = planStarted ? planCurrentDay(planState.startedAt as number) : 0
  // 计划完成状态：已完成全部任务的天数 x/7（lane7 冲刺）
  const planDaysDone = PLAN_DAYS.filter((d) =>
    d.tasks.every((t) => (planState.doneByDay[String(d.day)] ?? []).includes(t.id))
  ).length

  const onToggle = (slot: 'am' | 'pm') => {
    setCheckin((c) => ({ ...c, [slot]: toggleCheckin(slot) }))
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const daily = DAILY_SENTENCES[dayOfYear % DAILY_SENTENCES.length]

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

      {/* 每日一句：先听英文再听中文，跟读一遍 */}
      <section className="card home-daily">
        <p className="card-title">每日一句</p>
        <p className="home-daily-en">{daily.en}</p>
        <p className="home-daily-cn">{daily.cn}</p>
        <button
          className="home-daily-btn"
          onClick={() => speakSequence([{ text: daily.en, rate: 0.8 }, { text: daily.cn, zh: true, rate: 0.9 }])}
        >
          🔊 听一句（英文 + 中文）
        </button>
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
          <div className="home-stat">
            <b>{planDaysDone}/7</b>
            <span>计划完成（天）</span>
          </div>
        </div>
        {seen < 26 && (
          <p className="card-hint">
            口诀先辅音骨架、后元音血肉：先读 b / p / m / f，再读 a / e / i / o / u。
          </p>
        )}
      </section>

      {/* 六大板块入口 */}
      <section>
        <h2>六大板块</h2>
        <div className="home-grid">
          {ENTRIES.map((e) => (
            <div className="home-entry" key={e.name} onClick={() => window.dispatchEvent(new CustomEvent('kk:go-tab', { detail: e.go }))}>
              <div className="home-entry-ic" style={{ background: e.color }}>
                {e.char}
              </div>
              <b>{e.name}</b>
              <p>{e.desc}</p>
              <span className="where">{e.where}</span>
            </div>
          ))}
        </div>

        {/* lane7：七天计划入口卡 */}
        <button
          type="button"
          className="home-plan-entry"
          onClick={() => window.dispatchEvent(new CustomEvent('kk:open-extra', { detail: 'plan' }))}
        >
          <div className="home-entry-ic" style={{ background: '#8b5cf6' }}>计</div>
          <div className="home-plan-info">
            <b>七天计划</b>
            <p>一天 15 分钟，7 天拿下口诀 + 规则</p>
            <span className="where">
              {planStarted ? `进行到第 ${planDay} 天 · 点这里继续` : '点这里开始'}
            </span>
          </div>
          <span className="home-plan-arrow">→</span>
        </button>
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
