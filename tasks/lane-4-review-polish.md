# Lane 4 — 复习系统、对照表与打磨

> 拥有：`app/src/pages/Review.tsx`、`app/src/pages/IpaMap.tsx`、`app/src/store.ts`（仅增量扩展，不破坏现有导出）、`README.md`（app/ 下的），以及本 lane 页面的专属 css。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / 其他 lane 的文件。

- [x] 复习页 Review：早/晚朗读打卡（两个大按钮，调用 store 的 toggleCheckin('am'|'pm')，已打勾置灰）；打卡引导文案「早晚各读 3 遍口诀」+ 跳转口诀页提示；14 天打卡日历格子（store 的 recentCheckins）；连续天数 streakDays 大数字展示
- [~] 错题本：读取 store 的 wrong 字段，展示错词列表（词、kk 音标、错误次数），每词带发音按钮与「已掌握」按钮（markWrongMastered）；已掌握的折叠到分组底部；最小间隔复习：lastSeen 距今 <3 天的词标「3 天后再测」提示
- [ ] KK/IPA 对照页 IpaMap：渲染 kk-ipa.json 表格（word / KK / IPA / note），两列差异高亮，顶部说明卡「学校考 IPA 时把 KK 符号对照替换即可，发音相同」
- [ ] 学习建议卡：把周老师课堂方法做成 Review 页建议卡——同一内容至少读 20 遍、早晚各读 3 遍口诀、先搞定辅音骨架再判断元音血肉、先简单后困难；附来源声明（整理自网络公开的学习者笔记）
- [ ] 整体打磨与终检：`npm run build` 通过；写 `app/README.md`（项目介绍、运行方式、内容来源声明）；走查所有页面空态（无数据时文案）与移动端可用性
- [ ] 冲刺：深色模式适配（prefers-color-scheme，token 层切换）；错题待复习计数徽标（错题本中 lastSeen <3 天的数量展示在 Review 页顶部）
