import { useEffect, useState } from 'react'
import planData from '../data/plan.json'
import type { PlanDay, PlanLink } from '../types-plan'
import {
  getPlanState,
  loadProgress,
  startPlan,
  todayCheckin,
  togglePlanTask,
} from '../store'
import type { PlanState } from '../store'
import './plan.css'

// lane7 七天学习计划页：介绍卡 → 每日任务清单（手动打勾 + 自动打勾）→ 七天总进度 → 完成卡。
// 「去做」按钮：App.tsx 未开放 Tab 切换事件，这里直接点按底部 Tab 栏里对应文字的按钮完成跳转。

// JSON 用契约类型断言（JSON 导入时字面量会被拓宽）
const DAYS = planData as unknown as PlanDay[]

const TAB_LABEL: Record<PlanLink, string> = {
  chant: '口诀',
  rules: '规则',
  quiz: '练习',
  review: '复习',
}

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 当日已完成的练习轮数 */
function todayRounds(): number {
  const key = dayKey(new Date())
  return loadProgress().quizRounds.filter((r) => dayKey(new Date(r.date)) === key).length
}

/** 今天早/晚是否已任一打卡 */
function checkedInToday(): boolean {
  const c = todayCheckin()
  return !!(c.am || c.pm)
}

/** 按开始日期推算今天是计划第几天（1-7，超出按 7） */
function currentDayNum(startedAt: number): number {
  const start = new Date(startedAt)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.max(diff + 1, 1), 7)
}

/** 跳到对应底部 Tab 并关闭二级页 */
function goTab(link: PlanLink, onClose: () => void) {
  const label = TAB_LABEL[link]
  const btns = document.querySelectorAll<HTMLButtonElement>('.tab-bar button')
  const target = Array.from(btns).find((b) => (b.textContent ?? '').trim() === label)
  target?.click()
  onClose()
}

export default function Plan({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<PlanState>(() => getPlanState())
  const [viewDayRaw, setViewDay] = useState<number | null>(null)

  const started = state.startedAt != null
  const curDay = started ? currentDayNum(state.startedAt as number) : 0
  const viewDay = viewDayRaw ?? (started ? curDay : 1)

  // 自动打勾：只对「今天」的任务生效，条件满足且尚未记录时写入 doneByDay
  useEffect(() => {
    if (!started || viewDay !== curDay) return
    const day = DAYS[curDay - 1]
    if (!day) return
    const done = state.doneByDay[String(curDay)] ?? []
    const rounds = todayRounds()
    const ck = checkedInToday()
    let changed = false
    for (const t of day.tasks) {
      if (!t.autoCheck) continue
      const ok = t.autoCheck === 'checkin' ? ck : rounds >= (t.need ?? 1)
      if (ok && !done.includes(t.id)) {
        togglePlanTask(curDay, t.id)
        changed = true
      }
    }
    if (changed) setState(getPlanState())
  }, [started, curDay, viewDay, state])

  const totalTasks = DAYS.reduce((s, d) => s + d.tasks.length, 0)
  const doneTasks = DAYS.reduce(
    (s, d) =>
      s + (state.doneByDay[String(d.day)] ?? []).filter((id) => d.tasks.some((t) => t.id === id))
        .length,
    0
  )
  const daysDone = DAYS.filter((d) =>
    d.tasks.every((t) => (state.doneByDay[String(d.day)] ?? []).includes(t.id))
  ).length
  const allDone = doneTasks >= totalTasks

  const handleStart = () => {
    startPlan()
    setViewDay(null)
    setState(getPlanState())
  }

  const handleToggle = (day: number, taskId: string) => {
    togglePlanTask(day, taskId)
    setState(getPlanState())
  }

  const day = DAYS[viewDay - 1]
  const isToday = started && viewDay === curDay
  const dayDoneIds = state.doneByDay[String(viewDay)] ?? []
  const dayPct = Math.round((doneTasks / totalTasks) * 100)

  return (
    <div className="extra-page">
      <header className="extra-header">
        <button className="extra-back" onClick={onClose}>← 返回</button>
        <b>七天计划</b>
      </header>

      {!started ? (
        <>
          {/* 未开始：介绍卡 */}
          <section className="card plan-intro">
            <div className="plan-intro-emoji">🗓️</div>
            <p className="card-title">一天 15 分钟，7 天拿下口诀 + 规则</p>
            <p className="plan-intro-text">
              前两天读熟 26 个字母口诀，中间两天学会五个规则，最后三天用练习和复习巩固。
              跟着每天的小任务走，不知不觉就学会啦！
            </p>
            <ul className="plan-intro-list">
              <li>每天 3-5 个小任务，做完就打勾</li>
              <li>练习轮数和朗读打卡会自动帮你打勾</li>
              <li>进度自动保存在本机，随时接着学</li>
            </ul>
            <button className="btn btn-warm btn-block plan-start" onClick={handleStart}>
              开始七天计划
            </button>
          </section>

          {/* 七天大纲预览 */}
          <section className="card">
            <p className="card-title">七天都学什么</p>
            <ul className="plan-outline">
              {DAYS.map((d) => (
                <li key={d.day}>
                  <span className="plan-outline-day">第{d.day}天</span>
                  <span>{d.title}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          {/* 七天切换（任意一天可回看，只有今天能打勾） */}
          <div className="plan-days">
            {DAYS.map((d) => {
              const full = d.tasks.every((t) =>
                (state.doneByDay[String(d.day)] ?? []).includes(t.id)
              )
              return (
                <button
                  key={d.day}
                  className={`plan-day-chip ${viewDay === d.day ? 'on' : ''} ${full ? 'full' : ''}`}
                  onClick={() => setViewDay(d.day)}
                >
                  {full ? '✓ ' : ''}第{d.day}天
                </button>
              )
            })}
          </div>

          {/* 当日任务清单 */}
          <section className="card plan-day-card">
            <p className="plan-day-title">
              第 {viewDay} 天 · {day.title}
              {isToday && <span className="plan-day-today">今天</span>}
            </p>
            <p className="plan-day-goal">🎯 {day.goal}</p>
            {!isToday && (
              <p className="plan-day-readonly">
                这是「回看模式」，只有今天的任务能打勾哦。
              </p>
            )}
            <ul className="plan-tasks">
              {day.tasks.map((t) => {
                const autoOk =
                  !!t.autoCheck &&
                  isToday &&
                  (t.autoCheck === 'checkin' ? checkedInToday() : todayRounds() >= (t.need ?? 1))
                const done = dayDoneIds.includes(t.id) || autoOk
                const canToggle = isToday && !t.autoCheck
                const link = t.link
                return (
                  <li key={t.id} className={`plan-task ${done ? 'done' : ''}`}>
                    <button
                      type="button"
                      className="plan-task-check"
                      disabled={!canToggle}
                      aria-label={done ? '已完成' : '未完成'}
                      onClick={() => canToggle && handleToggle(viewDay, t.id)}
                    >
                      {done ? '✓' : ''}
                    </button>
                    <span className="plan-task-text">{t.text}</span>
                    {t.autoCheck && (
                      <span className="plan-task-auto">
                        {t.autoCheck === 'checkin' ? '自动打卡' : '自动统计'}
                      </span>
                    )}
                    {link && (
                      <button className="plan-task-go" onClick={() => goTab(link, onClose)}>
                        去做 →
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* 七天总进度 */}
          <section className="card">
            <p className="card-title">七天总进度</p>
            <div className="plan-bar">
              <span style={{ width: `${dayPct}%` }} />
            </div>
            <p className="plan-progress-text">
              已完成 {doneTasks}/{totalTasks} 个任务 · 完成天数 {daysDone}/7
            </p>
          </section>

          {/* 完成卡 */}
          {allDone && (
            <section className="card plan-done-card">
              <div className="plan-done-emoji">🎉</div>
              <p className="plan-done-title">七天计划完成啦！</p>
              <p className="plan-done-text">
                口诀和五个规则都拿下啦！以后每天读一读口诀、做一轮练习，
                100 个生词就稳稳装进脑袋啦。
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
