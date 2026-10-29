import { useState } from 'react'
import { recentCheckins, streakDays, todayCheckin, toggleCheckin } from '../store'
import type { Checkin } from '../store'
import IpaMap from './IpaMap'
import './review.css'

// lane4 复习页：早晚朗读打卡、连续天数、14 天打卡日历；下方还有错题本与学习建议。
export default function Review() {
  const [today, setToday] = useState<Checkin>(() => todayCheckin())
  const [days, setDays] = useState(() => recentCheckins(14))
  const [streak, setStreak] = useState(() => streakDays())

  function toggle(slot: 'am' | 'pm') {
    toggleCheckin(slot)
    setToday(todayCheckin())
    setDays(recentCheckins(14))
    setStreak(streakDays())
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

      <IpaMap />
    </div>
  )
}

/** 与日历里 MM-DD 同格式的今天标记 */
function todayKeyLabel(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
