# Lane 2 — 口诀与音标核心页（前端基础）

> 拥有：`app/src/pages/Home.tsx`、`app/src/pages/Chant.tsx`、`app/src/components/`、`app/src/hooks/useSpeech.ts`、`app/src/styles.css`，以及本 lane 页面的专属 css。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / vite.config / 其他 lane 的文件。
> styles.css 只放全局 token 与通用样式；页面专属样式另建 css 文件自行 import。

- [x] 完善 `src/hooks/useSpeech.ts`：speak(text, opts) 支持 rate 默认 0.75、优先选 en-US 语音、语音列表异步加载兼容（voiceschanged）、iOS/Safari 首次交互解锁（unlockSpeech）、播放前 cancel 防重叠；导出 speakLetter / speakWord 便捷方法；暴露 `supported` 标志供 UI 降级提示
- [x] 全局视觉设计系统：styles.css 定义颜色 token（建议暖黄 + 深蓝，友好童趣）、卡片、大按钮（含发音按钮通用样式 .btn-speak）、Tab 栏；375px 优先，max-width 480px 居中
- [x] 首页 Home：今日任务卡（早/晚朗读打卡，调用 store 的 todayCheckin / toggleCheckin 展示状态并跳转复习 Tab 的提示文案）、学习进度总览（seenLetters 数、quizRounds 正确率、streakDays）、四大板块入口卡、课程理念卡（100 词 = 90 口诀 + 5 规则 + 5 排除 的比喻）
- [ ] 口诀页 Chant：26 字母卡片墙（大写字母、KK 音标、联想汉字、sample 例词 + 发音按钮）；l/m/n/r 显示「前/后」两种读法切换；点卡片开单字母详情浮层（tips 口型提示、2+2 跟读按钮：先播字母音×2 再播例词音×2，中间留间隔）
- [ ] 口诀连读模式：a→z 顺序自动播放（每个字母播 2+2），可暂停/继续/手动下一个；底部进度点显示当前字母；播放完提示「读完 1 遍，建议读满 20 遍」
- [ ] 冲刺：单字母详情浮层加「跟读对比」：MediaRecorder 录自己朗读并回放，与 TTS 播放并排两个按钮（无麦克风权限时优雅降级隐藏）
