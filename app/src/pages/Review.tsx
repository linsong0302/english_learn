import { useState } from 'react'
import {
  loadProgress,
  markWrongMastered,
  recentCheckins,
  streakDays,
  todayCheckin,
  toggleCheckin,
} from '../store'
import type { Checkin, WrongWord } from '../store'
import { speakWord } from '../hooks/useSpeech'
import IpaMap from './IpaMap'
import './review.css'

/** 错题最小复习间隔：3 天 */
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

// lane4 复习页：早晚朗读打卡、连续天数、14 天打卡日历、错题本、学习建议、KK/IPA 对照。
export default function Review() {
  const [today, setToday] = useState<Checkin>(() => todayCheckin())
  const [days, setDays] = useState(() => recentCheckins(14))
  const [streak, setStreak] = useState(() => streakDays())
  const [wrong, setWrong] = useState(() => loadProgress().wrong)

  function toggle(slot: 'am' | 'pm') {
    toggleCheckin(slot)
    setToday(todayCheckin())
    setDays(recentCheckins(14))
    setStreak(streakDays())
  }

  function master(word: string) {
    markWrongMastered(word)
    setWrong(loadProgress().wrong)
  }

  return (
    <div className="page rev-page">
      <h1>复习</h1>

      {/* 连续打卡天数 */}
      <div className="card rev-streak">
        <div className="rev-streak-num">
          <b>{streak}</b>
          <span>天</span>
        </div>
        <p className="rev-streak-text">连续朗读打卡{streak > 0 ? '，继续保持！' : '，从今天开始吧！'}</p>
      </div>

      {/* 早晚打卡 */}
      <div className="card rev-checkin">
        <div className="rev-checkin-title">今日朗读打卡</div>
        <p className="rev-hint">
          记住周老师的话：<b>早晚各读 3 遍口诀</b>。读完到下方「口诀」页连读一遍，效果最好！
        </p>
        <div className="rev-checkin-row">
          <button
            className={'rev-check-btn am' + (today.am ? ' done' : '')}
            onClick={() => toggle('am')}
            aria-label={today.am ? '早上打卡已完成' : '早上打卡'}
          >
            <span className="rev-check-icon">{today.am ? '✓' : '☀️'}</span>
            <span className="rev-check-label">早上打卡</span>
            <span className="rev-check-sub">{today.am ? '已完成' : '读 3 遍口诀'}</span>
          </button>
          <button
            className={'rev-check-btn pm' + (today.pm ? ' done' : '')}
            onClick={() => toggle('pm')}
            aria-label={today.pm ? '晚上打卡已完成' : '晚上打卡'}
          >
            <span className="rev-check-icon">{today.pm ? '✓' : '🌙'}</span>
            <span className="rev-check-label">晚上打卡</span>
            <span className="rev-check-sub">{today.pm ? '已完成' : '再读 3 遍口诀'}</span>
          </button>
        </div>
      </div>

      {/* 14 天打卡日历 */}
      <div className="card rev-cal">
        <div className="rev-cal-title">最近 14 天</div>
        <div className="rev-cal-grid">
          {days.map((d) => {
            const isToday = d.date === todayKeyLabel()
            return (
              <div key={d.date} className={'rev-cal-cell' + (isToday ? ' today' : '')}>
                <span className="rev-cal-date">{d.date}</span>
                <span className="rev-cal-marks">
                  <i className={d.am ? 'on' : ''}>☀</i>
                  <i className={d.pm ? 'on' : ''}>☾</i>
                </span>
              </div>
            )
          })}
        </div>
        <p className="rev-cal-legend">☀ = 早上 · ☾ = 晚上 · 灰色 = 未打卡</p>
      </div>

      {/* 错题本 */}
      <WrongBook wrong={wrong} onMaster={master} />

      {/* 学习建议卡（周老师课堂方法） */}
      <TipsCard />

      <IpaMap />
    </div>
  )
}

/** 错题本：未掌握在前（按最近答错时间排序），已掌握的折叠到分组底部 */
function WrongBook(props: { wrong: Record<string, WrongWord>; onMaster: (word: string) => void }) {
  const [showMastered, setShowMastered] = useState(false)
  const all = Object.values(props.wrong)
  const active = all
    .filter((w) => !w.mastered)
    .sort((a, b) => b.lastSeen - a.lastSeen)
  const mastered = all.filter((w) => w.mastered)

  return (
    <div className="card rev-wrong">
      <div className="rev-wrong-title">错题本（{active.length} 个待复习）</div>

      {active.length === 0 && mastered.length === 0 && (
        <p className="rev-wrong-empty">
          错题本还是空的！去底部「练习」页测一轮，答错的词会自动收进来。
        </p>
      )}

      {active.map((w) => (
        <div className="rev-wrong-item" key={w.word}>
          <button
            className="rev-wrong-say"
            onClick={() => speakWord(w.word)}
            aria-label={`读 ${w.word}`}
          >
            🔊
          </button>
          <div className="rev-wrong-main">
            <b className="rev-wrong-word">{w.word}</b>
            <span className="rev-wrong-kk">{w.kk}</span>
            <span className="rev-wrong-count">答错 {w.count} 次</span>
          </div>
          <div className="rev-wrong-side">
            {Date.now() - w.lastSeen < THREE_DAYS_MS && (
              <span className="rev-wrong-wait">3 天后再测</span>
            )}
            <button className="rev-wrong-master" onClick={() => props.onMaster(w.word)}>
              已掌握
            </button>
          </div>
        </div>
      ))}

      {active.length === 0 && mastered.length > 0 && (
        <p className="rev-wrong-clear">太棒了，待复习的错题清零啦！</p>
      )}

      {mastered.length > 0 && (
        <div className="rev-wrong-done">
          <button className="rev-wrong-toggle" onClick={() => setShowMastered((s) => !s)}>
            已掌握（{mastered.length}）{showMastered ? '▲' : '▼'}
          </button>
          {showMastered &&
            mastered.map((w) => (
              <div className="rev-wrong-item mastered" key={w.word}>
                <button
                  className="rev-wrong-say"
                  onClick={() => speakWord(w.word)}
                  aria-label={`读 ${w.word}`}
                >
                  🔊
                </button>
                <div className="rev-wrong-main">
                  <b className="rev-wrong-word">{w.word}</b>
                  <span className="rev-wrong-kk">{w.kk}</span>
                  <span className="rev-wrong-count">答错 {w.count} 次</span>
                </div>
                <span className="rev-wrong-ok">✓ 已掌握</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/** 学习建议卡：周老师课堂上的复习方法，附来源声明 */
function TipsCard() {
  const tips = [
    { icon: '🔁', text: '同一内容至少读 20 遍：多读几遍，嘴巴自然记住发音位置。' },
    { icon: '🌅', text: '早晚各读 3 遍口诀：a → z 顺一遍，早一次晚一次，记得最牢。' },
    { icon: '🦴', text: '先搞定辅音骨架，再判断元音血肉：先读准 b、k、t 这些硬音，再补元音。' },
    { icon: '🪜', text: '先简单后困难：先把简单词读顺，再挑战难词，一步一个台阶。' },
  ]
  return (
    <div className="card rev-tips">
      <div className="rev-tips-title">学习建议</div>
      <ul className="rev-tips-list">
        {tips.map((t) => (
          <li key={t.icon}>
            <span className="rev-tips-icon">{t.icon}</span>
            <span>{t.text}</span>
          </li>
        ))}
      </ul>
      <p className="rev-tips-source">内容整理自网络公开的学习者笔记（周育如音标课程），仅作学习交流。</p>
    </div>
  )
}

/** 与日历里 MM-DD 同格式的今天标记 */
function todayKeyLabel(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
