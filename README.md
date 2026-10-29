# 2_音标学习 — KK 音标学习 App（周育如课程体系）

> 正在以 ralph 并行方式实现中（4 条 lane 并行，至 **08:00** 自动停止）。

- 规划：[PLAN.md](PLAN.md) · 工作者守则：[AGENTS.md](AGENTS.md) · 任务看板：[tasks/](tasks/)
- 循环日志：`.ralph/logs/lane*.log`（`tail -f .ralph/logs/lane1.log`）
- **停止循环**：创建文件 `.ralph/STOP` 即可，所有 lane 会在当前任务后退出
- 进度一览：`tasks/lane-*.md` 的勾选状态 + `git log --oneline`
- 运行方式说明：当前为「会话托管 ralph」（每条 lane 一个后台 agent，按任务文件循环推进）。`.ralph/ralph-all.sh` 保留了 CLI 子进程版循环，但 zcode CLI 0.17.0 的 headless 模式尚不支持指定默认模型（`Select a model` 报错），故暂用会话托管方式

## 运行应用

```bash
cd app
npm install   # 首次
npm run dev   # http://localhost:5173
```

构建验收：`cd app && npm run build`

## 内容来源

周育如音标课核心笔记（KK 音标版），整理自网络公开的学习者记录。
核心框架：一个口诀（26 字母常见发音）+ 五个规则。
