// 七天学习计划数据契约（lane7 所有）：每天 3-5 个小任务，做完打勾。

export type PlanLink = 'chant' | 'rules' | 'quiz' | 'review'
export type PlanAutoCheck = 'quizRound' | 'checkin'

export interface PlanTask {
  id: string // 任务 id（同一天内唯一，如 "d1-follow"）
  text: string // 任务描述（亲切口语化）
  /** 有跳转目标时显示「去做」按钮，跳对应 Tab */
  link?: PlanLink
  /** 满足当日条件时自动打勾：quizRound=当日练习轮数达标；checkin=当日早/晚任一已打卡 */
  autoCheck?: PlanAutoCheck
  /** autoCheck='quizRound' 时要求的当日练习轮数，默认 1 */
  need?: number
}

export interface PlanDay {
  day: number // 1-7
  title: string // 如 "口诀上半场 a–m"
  goal: string // 一句话目标
  tasks: PlanTask[]
}
