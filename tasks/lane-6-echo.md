# Lane 6 — 语音识别跟读打分（Echo）· 第二波

> 拥有：`app/src/pages/Echo.tsx`、`app/src/hooks/useSpeechRecognition.ts`、`app/src/lib/similarity.ts`、`app/src/pages/echo.css`、`app/src/pages/Quiz.tsx`（仅允许加入口按钮，不得破坏现有功能）。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / vite.config / .ralph/ / tasks/ 其他 lane 文件 / 其他页面 / store.ts（lane7 在改）。
> 每次改动后 `cd app && npm run build` 必须 0 error。

## 背景说明
- 二级页机制：`Echo` 组件接收 `{ onClose }`，根节点 `.extra-page`，头部 `.extra-header` + `.extra-back`（返回按钮调 onClose）
- 识别用 Web Speech Recognition（`webkitSpeechRecognition` / `SpeechRecognition`），lang 'en-US'；Chrome/Edge 及 iOS Safari 14.5+ 支持，不支持时必须优雅降级
- TTS 示范走 `src/hooks/useSpeech.ts` 的 speakWord（禁止直接调 speechSynthesis）
- 词库 `words.json`（164 词，含 kk/rule/level 字段）

- [x] 识别封装：`app/src/hooks/useSpeechRecognition.ts`——export function useSpeechRecognition()，返回 { supported, listening, result, error, start, stop, reset }；lang en-US、interimResults true、maxAlternatives 3（把备选也返回，打分用最优匹配）；处理 error 类型（not-allowed → 「麦克风权限被拒绝」，no-speech → 「没听到声音，再试一次」，network → 「语音服务不可用」）；组件卸载时 abort 清理
- [x] 相似度：`app/src/lib/similarity.ts`——normalize（小写、去标点、压缩空格）+ Levenshtein 编辑距离 + similarity(a,b): number (0-1)；支持多候选（alternatives 数组取最高分）
- [x] 跟读页：选词方式（随机 10 词一轮，可按 level 筛选）→ 每词流程：卡片展示目标词 + KK 音标 + 「听示范」（speakWord）→ 大按钮「按住说」或点按开始/停止（识别中显示动效）→ 识别完成后打分：相似度 ≥0.9 ⭐⭐⭐「太棒了」/ ≥0.6 ⭐⭐「不错，再来一次更准」/ 其他 ⭐「再听一遍示范」，显示识别到的文本、目标词、音标、可重试/下一个 → 一轮结束结算页（总星数、平均分、错词重练）。识别不支持时：整页显示降级提示卡（说明当前浏览器不支持语音识别）+ 引导「去口诀页点开字母卡片用录音对比」
- [ ] 入口接线：Quiz 页顶部加「跟读打分」入口按钮，onClick 里 `window.dispatchEvent(new CustomEvent('kk:open-extra', { detail: 'echo' }))`
- [ ] 冲刺：跟读统计（独立 localStorage key，不用 store.ts）——今日跟读词数、今日平均星级，Echo 页顶部小卡展示；每词结果可「加入收藏」存独立 key，供下次优先练
