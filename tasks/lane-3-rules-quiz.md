# Lane 3 — 规则学习与测验

> 拥有：`app/src/pages/Rules.tsx`、`app/src/pages/Quiz.tsx`、`app/src/lib/quiz.ts`，以及本 lane 页面的专属 css。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / 其他 lane 的文件。
> 数据经 `src/data/*.json` 读取；写进度用 `src/store.ts` 现有 API（recordQuizRound / addWrongWord 等）。

- [~] 规则页 Rules：五大规则课程卡（标题、summary、detail、mnemonic 若有、例词列表每词带发音按钮 + kk 音标 + note）；规则 5 用 combos 渲染组合表（组合、音标、例词、备注）；每条规则可展开「小测验」（用 combos/examples 出 2-3 道选择或判断，本地即时判分）
- [ ] `src/lib/quiz.ts` 测验引擎：三种题型生成器——(a) 看词选音标 (b) 听音选词（TTS 播放，选词）(c) 判断该词用了哪条规则（选项含 none）；从 words.json 按 level 抽取，干扰项优先取同元音/相近音标/同规则的词；每轮 10 题，可指定题型或混合
- [ ] 练习页 Quiz：题型选择（三种 + 混合）→ 答题交互（听音题先自动播放 + 可重播按钮；选择后立即反馈对错 + 正确答案 + 发音回放）→ 结算页（分数、错题列表带发音、再来一轮）
- [ ] 测验结果持久化：每轮结束调用 store 的 recordQuizRound 与 addWrongWord（答错的词写入错题本），答对的 seen 词不需要记录；结算页展示历史最近 5 轮成绩
- [ ] 冲刺：每日一测——每天首次进入 Quiz 提示「今日一测」，混合 10 题，完成后记录日期；历史成绩列表按日期展示正确率
