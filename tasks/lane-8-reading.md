# Lane 8 — 英文文章阅读（Reading）· 第三波

> 拥有：`app/src/pages/Reading.tsx`、`app/src/pages/reading.css`、`app/src/data/articles.json`、`app/src/lib/translate.ts`、`app/src/lib/articleTypes.ts`
> 🔒 禁改：其他 lane 文件；`App.tsx` 的「阅读」Tab 接线由发起方完成（[core] 提交）。
> 每次改动后 `cd app && npm run build` 必须 0 error。发音一律走 useSpeech 导出。

## 背景说明
- 用户诉求：能读英文文章（BBC 等），能自动翻译，界面更好看
- 版权与网络约束：不拷贝 BBC 等版权文章；内置**原创**分级短文（带参考译文，离线可用）；用户可自行粘贴任意来源文章
- 翻译方案：内置文章用自带参考译文（离线）；自定义文章按段调 MyMemory 免费接口（无需密钥，8 秒超时，失败友好提示）；中国网络环境可能不可达，必须优雅降级
- 朗读方案：扩展 useSpeech 的 speakSequence（SpeakItem 加 onStart），新增 speakSentences 逐句朗读 + 逐句回调（高亮用）

- [~] 数据与类型：`data/articles.json` 内置 3 篇原创分级短文（title/source/level/paragraphs 句子数组/translation 每段参考译文/glossary 重点词释义），`lib/articleTypes.ts` 定义 Article 契约
- [ ] useSpeech 扩展（lane2 文件，[lane2] 提交）：SpeakItem 增加可选 onStart，新增导出 speakSentences(texts, { rate, onSentence, onDone })，stopSpeaking 可打断
- [x] Reading 页：文章列表（内置 3 篇 + 「粘贴英文文章」入口，自定义文章存 localStorage，可删除）+ 阅读视图（句子排版、点句从该句朗读、当前句高亮、语速滑块、播放/停止、内置文章参考译文显隐开关、自定义文章按段「译」按钮）+ 生词点查（点单词弹释义卡：先查文章 glossary，未收录走在线单词翻译，失败友好提示）
- [x] 翻译服务：`lib/translate.ts`——MyMemory 免密钥接口封装（分段 ≤450 字符、localStorage 缓存、8 秒超时）；在线不可达时按钮显示失败原因，不阻塞阅读
- [x] App.tsx「阅读」Tab 接线（[core] 提交，发起方完成）
- [ ] （下一批，lane2）全局界面美化：styles.css 设计令牌翻新（配色/圆角/阴影/渐变）、Tab 栏与卡片微交互动画、复习页深色主题并入统一体系——全局回归风险大，单独一轮做
- [x] 阅读生词本：查词成功自动收入（localStorage，去重），文章列表页「生词本」卡——词列表 + 点🔊听读 + 单词删除 + 一键清空
