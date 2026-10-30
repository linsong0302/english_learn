# Ralph Lane 工作者守则（每个 lane 的 agent 实例必读）

你是 ralph 并行循环中的一个 lane 工作者实例。**依次完成你 lane 任务文件中的全部任务**（从上到下，一次一个），直到任务做完或出现 STOP 文件（第二波无固定截止时间）。

## 开工流程（对每个任务重复执行）

1. Read 本文件、`PLAN.md`、以及你的 lane 任务文件（发起方 prompt 中给出路径）
2. 取当前第一个 `- [ ]` 任务，先把它的复选框改为 `- [~]`
3. 先读相关现有代码与数据，保持既有风格，再动手实现
4. 验收：`cd app && npm run build` 必须通过（0 error）。这是唯一硬性验收
5. 把 `- [~]` 改为 `- [x]`
6. 提交：`git add -A && git commit -m "[laneN] <任务标题>"`（若遇 index.lock 冲突，等 5 秒重试，最多 5 次；提交里可能包含其他 lane 的半成品，属正常，不必处理）
7. 向 `.ralph/logs/<lane>.log` 追加一行进度（时间 + 任务名），然后继续下一个任务
8. **停止条件**（任一满足即停止并输出总结）：任务全部完成；`.ralph/STOP` 文件存在

## 硬性规则

- 只修改 `PLAN.md`「文件所有权」分配给你 lane 的文件。🔒 锁定文件一律不改：`App.tsx`、`main.tsx`、`index.html`、`package.json`、`tsconfig.json`、`vite.config.ts`、`vite-env.d.ts`、`.ralph/`、`AGENTS.md`、`PLAN.md`、以及 tasks/ 中不属于你的 lane 文件
- 需要新依赖时：不要安装，在该任务下方追加一行注释说明需求，保持 build 通过
- 不重构、不删除其他 lane 的代码；不"顺手"改别人页面的样式
- 所有 UI 文案用简体中文，语气亲切，中小学生和零基础成人都能看懂
- 发音一律通过 `src/hooks/useSpeech.ts` 导出的 speak / speakWord / speakLetter，禁止直接调用 speechSynthesis
- JSON 结构如需变化：同步改 `src/types.ts`（仅 lane1 允许，且只能增量扩展），并保证 build 通过
- `src/store.ts` 现有导出函数签名不可破坏（仅 lane4 可增量扩展）
- 若 `.ralph/STOP` 文件存在：什么都不做，直接退出
- 实在完成不了：把 `- [~]` 改回 `- [ ]`，任务下方追加一行 `- 失败: <原因>`，commit 后退出，不要硬凑

## 质量与风格

- 组件小而清晰，一个文件一个主组件
- 移动端优先：375px 宽度必须好看，容器 max-width 480px 居中
- 卡片式布局、大按钮、大字号——音标是主角
- 若 build 报错与并发写 dist 有关（ENOTEMPTY / EPERM dist），等几秒重试一次 build 再判断
