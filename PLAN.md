# KK 音标学习 App · 项目规划（周育如课程体系）

> 目标：做一个以「**一个口诀 + 五个规则**」为核心的英语发音学习 Web App。
> 移动端优先，浏览器直接可用，后续可打包为手机 App。

## 一、内容框架（来自周育如音标课笔记）

- **口诀**：26 个字母的常见 KK 音标 + 联想汉字（如 b → /b/「啵啵」），每个字母读 2 遍字母音 + 2 遍音标音（2+2 跟读）；其中 **l / m / n / r** 有「前 / 后」两种读法
- **五个规则**：
  1. 词尾 e 不发音，前面元音读字母本身的音（name → /neɪm/）
  2. 元音 + r：第一次出现（重音节）读长音 /ɝ/，第二次出现/词尾读短音 /ɚ/（work / worker）
  3. oo 相连：多数短音 /ʊ/（good、book），少数长音 /u/（room、food）
  4. au / ou / aw / ow 通常发 /aʊ/（house、how、now）
  5. 常见辅音组合：th清/θ/、th浊/ð/、ch/tʃ/、sh/ʃ/、ph/f/、ng词尾/ŋ/、ng有时/ŋg/、nk/ŋk/
- **理念**：100 词 = 90 靠口诀 + 5 靠规则 + 5 靠排除；同一内容至少读 20 遍、早晚各读 3 遍口诀；先辅音骨架后元音血肉、先简单后困难
- **KK vs IPA**：教学用 KK（美式），提供对照表；学校考试考 IPA 时符号替换即可，发音相同

## 二、技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 框架 | Vite + React 18 + TypeScript | 类型安全，构建快 |
| 路由 | App 内 useState Tab 切换 | 无需路由库 |
| 发音 | Web Speech API（speechSynthesis） | 零依赖离线，en-US，语速 0.75 |
| 数据 | 静态 JSON + `src/types.ts` 契约 | 内容与代码分离，便于扩充 |
| 存储 | localStorage（`src/store.ts`） | 进度 / 打卡 / 错题本，免后端 |
| 样式 | 手写 CSS，全局 token 在 `styles.css` | 无 UI 框架依赖 |

## 三、信息架构（底部 5 Tab）

1. **首页**：今日任务（早/晚朗读打卡入口）、进度总览、四大板块入口、课程理念卡（口诀90/规则5/排除5）
2. **口诀**：26 字母卡片墙（字母 + KK 音标 + 联想汉字 + 例词点读），l/m/n/r 前后读法切换，单字母详情（2+2 跟读），口诀连读模式（a→z 自动播放）
3. **规则**：五大规则课程卡 + 例词点读 + 每条规则小测验；规则 5 以辅音组合表呈现
4. **练习**：题型选择（看词选音标 / 听音选词 / 判断规则）→ 每轮 10 题 → 即时反馈 → 结算；错题自动进错题本
5. **复习**：早晚打卡 + 14 天日历 + 连续天数；错题本（间隔复习）；KK/IPA 对照表；学习建议卡

## 四、目录结构与文件所有权（并行 lane 防冲突核心）

```
2_音标学习/
├── PLAN.md / AGENTS.md / README.md / tasks/   # 规划与任务看板
├── .ralph/                                     # ralph 循环脚本与日志（lane 禁改）
└── app/
    ├── package.json / tsconfig.json / vite.config.ts / index.html   # 🔒 脚手架锁定
    └── src/
        ├── main.tsx / App.tsx / vite-env.d.ts  # 🔒 脚手架锁定
        ├── types.ts        # 数据契约（仅 lane1 可增量扩展）
        ├── store.ts        # 进度存储 API（仅 lane4 可增量扩展，不得破坏现有导出）
        ├── styles.css      # 全局设计 token（lane2 所有）
        ├── hooks/useSpeech.ts                  # 发音封装（lane2 所有）
        ├── components/                         # 通用组件（lane2 所有）
        ├── lib/quiz.ts                         # 测验引擎（lane3 所有）
        ├── pages/Home.tsx / Chant.tsx          # lane2 所有
        ├── pages/Rules.tsx / Quiz.tsx          # lane3 所有
        ├── pages/Review.tsx / IpaMap.tsx       # lane4 所有
        └── data/*.json / data/validate.mjs     # lane1 所有
```

**规则：不在所有权内的文件一律不改。** 需要新依赖时不安装，在任务下备注即可。

## 五、Ralph 并行实现机制

- 4 条 lane 各有独立任务文件 `tasks/lane-N-*.md`，互不交叉
- `.ralph/ralph-all.sh` 启动 4 个并行循环；每个循环：领取自己 lane 文件里下一个 `- [ ]` 任务 → 标 `- [~]` → 调 zcode CLI（headless，yolo 模式）实现 → `npm run build` 验收 → 勾 `- [x]` → git 提交 → 下一个
- 同一任务连续失败 3 次标 `- [!]` 跳过；创建 `.ralph/STOP` 文件可随时停机；到 **08:00** 自动退出
- 日志在 `.ralph/logs/`；进度看 tasks 勾选状态与 `git log`

## 六、验收标准

- `cd app && npm run build` 0 error（每个任务完成后的唯一硬性验收）
- 全部 UI 中文、移动端优先（375px 可用）、发音统一走 useSpeech
- 内容忠实于周育如课程笔记（KK 体系），保留来源声明
