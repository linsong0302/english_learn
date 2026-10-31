# Lane 5 — 音标卡组页（Sounds）· 第二波

> 拥有：`app/src/pages/Sounds.tsx`、`app/src/data/phonemes.json`、`app/src/types-phonemes.ts`、`app/src/pages/sounds.css`、`app/src/pages/Chant.tsx`（仅允许在顶部加入口按钮及必要小改，不得破坏现有功能）。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / vite.config / .ralph/ / tasks/ 其他 lane 文件 / 其他页面。
> 每次改动后 `cd app && npm run build` 必须 0 error。

## 背景说明
- 二级页机制已就绪：`Sounds` 组件由 App.tsx 挂载，接收 `{ onClose }` props，页面根节点用 `.extra-page`，头部用 `.extra-header` + `.extra-back`（返回按钮调 onClose）。全局样式（card/btn-speak/seg/chip 等 token）直接用 styles.css 现有的
- 音标本身无法被 TTS 朗读（会读成字母名），所以「听示范」一律通过**例词**实现：speakWord(exampleWord)
- 数据参考：`letters.json`（26 字母 KK 音标 + 口型 tips）、`rules.json`（规则 5 辅音组合）、`words.json`（164 词，例词优先从这里匹配，保证点读准确）

- [x] 数据层：写 `app/src/types-phonemes.ts`（interface Phoneme { id; kk; type: 'vowel'|'consonant'|'combo'; tip: string; examples: {word; kk}[] }）和 `app/src/data/phonemes.json`。音标取自课程笔记体系：元音 i /ɪ/ ɛ /ɛ/ æ /æ/ ɑ /ɑ/ ɔ /ɔ/ ʌ /ʌ/ ʊ /ʊ/ u /u/ eɪ /eɪ/ aɪ /aɪ/ oʊ /oʊ/ ɔɪ /ɔɪ/ aʊ /aʊ/ ɝ /ɝ/ ɚ /ɚ/；辅音 p b t d k g f v s z θ /θ/ ð /ð/ ʃ /ʃ/ tʃ /tʃ/ dʒ /dʒ/ m n ŋ /ŋ/ l r w j h；组合 kw /kw/ ks /ks/。每项配一句口型 tip（参考 letters/rules 已有表述）和 2-3 个例词（优先 words.json 真实存在的词，如 æ→cat、ɝ→bird、ŋ→song、kw→quick、ks→box）
- [x] 卡片墙：Sounds 页分类分段切换（元音 / 辅音 / 组合，用 .seg），网格卡片（大字号音标 + 首个例词 + 点读小按钮 speakWord）；点卡片开详情浮层（用 .overlay/.sheet）：大音标、口型 tip、例词列表每词带点读、「听示范」按钮（读第一个例词）
- [x] 卡组自测：详情浮层或页内「测一测」入口，10 题混合两种题型——(a) 听例词选音标（TTS 播例词，4 个音标选项）(b) 看口型提示猜音标；即时反馈 + 结算；用独立 localStorage key 记录正确率
- [x] 入口接线：Chant 页顶部工具行加「音标总表」按钮，onClick 里 `window.dispatchEvent(new CustomEvent('kk:open-extra', { detail: 'sounds' }))`
- [x] 冲刺：详情浮层加「最近学过的音标」区（localStorage 独立 key 记录最近浏览的 8 个音标 id）
- [x] 音标本音点读：phonemes.json 每条加 ASCII `audio` 文件名字段（41 个 slug 全局唯一，如 θ→th、tʃ→tch、ɝ→er）；types-phonemes.ts 加 `audio?: string`；Sounds 页卡片 🔊 改为听音标本音（speakPhoneme，无录音自动退回读例词），详情浮层加独立「听音标」按钮，intro 与浮层提示文案同步更新（依赖 lane2 的 speakPhoneme 先合入）
