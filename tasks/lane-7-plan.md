# Lane 7 — 七天学习计划（Plan）· 第二波

> 拥有：`app/src/pages/Plan.tsx`、`app/src/data/plan.json`、`app/src/types-plan.ts`、`app/src/pages/plan.css`、`app/src/store.ts`（仅增量扩展，不得破坏现有导出）、`app/src/pages/Home.tsx`（仅允许加入口卡，不得破坏现有功能）。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / vite.config / .ralph/ / tasks/ 其他 lane 文件 / 其他页面。
> 每次改动后 `cd app && npm run build` 必须 0 error。

## 背景说明
- 二级页机制：`Plan` 组件接收 `{ onClose }`，根节点 `.extra-page`，头部 `.extra-header` + `.extra-back`（返回按钮调 onClose）
- store.ts 现有导出（不得破坏）：loadProgress/addSeenLetter/recordQuizRound/addWrongWord/markWrongMastered/toggleCheckin/todayCheckin/recentCheckins/streakDays
- 可联动数据：quizRounds（当日练习轮数）、checkins（当日打卡）、recentCheckins——用于「任务自动打勾」
- 各页面入口：口诀=底部「口诀」Tab，规则=「规则」Tab，练习=「练习」Tab，复习=「复习」Tab；连读模式在口诀页内

- [x] 数据层：`app/src/types-plan.ts`（interface PlanDay { day: number; title: string; goal: string; tasks: { id; text; link?: 'chant'|'rules'|'quiz'|'review'; autoCheck?: 'quizRound'|'checkin' }[] }）+ `app/src/data/plan.json` 七天内容：Day1 口诀 a–m（去口诀页跟读 2+2）；Day2 口诀 n–z（重点 l/m/n/r 前后读法）；Day3 规则 1+2（各做一次小测验）；Day4 规则 3+4+5（组合表读一遍）；Day5 练习：听音选词 2 轮；Day6 练习：看词选音标 + 判断规则各 1 轮；Day7 总复习：每日一测 + 复习页错题本过一遍 + 早晚口诀打卡。每天 3-5 个任务项，文字亲切口语化
- [x] store 扩展：planState { startedAt?: number; doneByDay: Record<string, string[]> }（key=天数数字字符串，value=已完成任务 id 列表），新增 API：startPlan()（记录开始日期）/ getPlanState() / togglePlanTask(day, taskId)；key 沿用 'kk-phonics-progress-v1' 同一存储对象（在 Progress 接口加可选字段 planState），保持向后兼容
- [ ] Plan 页：未开始 → 介绍卡（计划说明：一天 15 分钟，7 天拿下口诀+规则）+「开始七天计划」大按钮；进行中 → 第 N 天标题 + 当日任务清单（每项一行：勾选框 + 任务文字 + 有 link 的加「去做」按钮跳对应 Tab；autoCheck 类型任务当日条件满足时自动打勾——quizRound=当日 recordQuizRound 轮数≥要求、checkin=当日 am/pm 任一已打卡）+ 七天总进度条 + 可切换查看任意一天的清单（过去/未来天数只读）；Day7 全部完成显示 🎉 完成卡
- [ ] 入口接线：Home 页在四大板块入口卡之后加「七天计划」入口卡（图标/标题/一句话描述），onClick 里 `window.dispatchEvent(new CustomEvent('kk:open-extra', { detail: 'plan' }))`；已开始时入口卡上显示「进行到第 N 天」
- [ ] 冲刺：计划完成状态写进首页进度总览（已完成天数 x/7）
