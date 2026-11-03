# Lane 9 — 英文写作教练（Writing）· 第三波

> 拥有：`app/src/pages/Writing.tsx`、`app/src/pages/writing.css`、`app/src/data/writing-templates.json`、`app/src/lib/writingTypes.ts`
> 🔒 禁改：其他 lane 文件；`App.tsx` 的「写作」Tab 接线由发起方完成（[core] 提交）。
> 每次改动后 `cd app && npm run build` 必须 0 error。发音一律走 useSpeech 导出。

## 背景说明
- 用户诉求：教怎么英文写作——用「模板 + 句式 + 仿写」的方式，而不是自由写作
- 结构：模板（场景分类）→ 三段式结构卡（开头/中间/结尾：写什么提示 + 常用句式，句式可点读）→ 仿写器（分段引导输入 + 句式点插 + 词数 + 自查清单）→ 作品保存（localStorage）→ 朗读自己的作文
- 范文均为原创编写，附中文翻译；发音走 useSpeech 的 speak / speakSentences

- [x] 数据与类型：`data/writing-templates.json` 8 个原创模板（自我介绍/我的爱好/我的家人/看图写话 L1；我的周末·过去式/我的学校生活/英语日记/邀请信 L2），每个含 blocks（开头中间结尾：提示 + 常用句式）、sample 范文（英+中）、checklist 自查清单；`lib/writingTypes.ts` 契约
- [x] Writing 页：模板列表（场景卡）→ 模板详情（结构卡 + 句式点读 + 范文中英对照 + 范文朗读）→ 仿写器（分段引导输入、句式点击插入、实时词数、自查清单、保存作品）→ 我的作品（继续编辑 / 朗读 / 删除，localStorage）
- [x] App.tsx「写作」Tab 接线（[core] 提交，发起方完成）
- [x] 作品一键复制导出：作品列表与仿写预览各加「📋 复制」按钮（navigator.clipboard，成功后按钮短暂显示「已复制」），方便交给老师或家长
