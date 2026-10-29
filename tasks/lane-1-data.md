# Lane 1 — 数据与词库（内容生产）

> 拥有：`app/src/data/` 下所有文件、`src/types.ts`（仅增量扩展）。
> 其他文件一律不改。每次改动后 `cd app && npm run build` 必须通过。

- [x] 词库扩充：把 `app/src/data/words.json` 扩充到 ≥80 个单词（当前约 49 个种子）。要求：覆盖五大规则例词与 26 字母例词；每词带 kk 音标、所属规则（rule 字段：rule1..rule5 或 none）、难度 level 1-3；KK 音标与周育如体系一致（参考 rules.json 与 PLAN.md）
- [x] rules.json 充实：每条规则补齐 mouthTips（口型要点）、commonMistakes（常见错误，2-3 条）、更多例词（每类 ≥6 个）；为每条规则加一个 `mnemonic`（中文记忆口诀句，字段需在 types.ts 增量扩展）；规则 5 的 combos 结构保持一致
- [x] letters.json 校对：26 项完整、hint 与课程笔记一致、l/m/n/r 四个字母的 variants（前/后两种读法）正确、每个字母的 sample 例词发音确实含该 KK 音标
- [~] 写 `app/src/data/validate.mjs`：node 直接运行，校验全部 JSON 符合结构（字段存在且类型正确、words 无重复、rule id 合法、letters 恰好 26 项），通过时打印 OK，失败时列出问题
- [ ] kk-ipa.json 扩充到 ≥8 行 KK↔IPA 对照，`note` 说明差异与替换建议
- [ ] 冲刺：words.json 扩到 ≥150 词，按 level 分层均匀；validate.mjs 覆盖 mnemonic 与全部新字段
