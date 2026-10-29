# KK 音标学习 App

以「**一个口诀 + 五个规则**」为核心的英语 KK 音标学习 Web App（周育如课程体系）。
移动端优先，浏览器直接可用；内容 = 26 字母口诀 + 五大发音规则 + 164 词练习词库 + KK/IPA 对照。

## 功能板块（底部 5 个 Tab）

1. **首页**：今日任务（早/晚朗读打卡）、学习进度总览、四大板块入口、课程理念卡（100 词 = 90 靠口诀 + 5 靠规则 + 5 靠排除）
2. **口诀**：26 字母卡片墙（字母 + KK 音标 + 联想汉字 + 例词点读）；l/m/n/r 前后两种读法；单字母详情（2+2 跟读）；连读模式
3. **规则**：五大规则课程卡 + 例词点读 + 每条规则小测验；规则 5 以辅音组合表呈现
4. **练习**：看词选音标 / 听音选词 / 判断规则 / 混合，每轮 10 题，即时反馈 + 发音回放；每日一测；错题自动进错题本
5. **复习**：早/晚朗读打卡 + 14 天打卡日历 + 连续天数；错题本（间隔复习、已掌握折叠、待复习徽标）；学习建议卡；KK ↔ IPA 对照表（差异高亮）

## 运行方式

```bash
cd app
npm install        # 首次安装依赖
npm run dev        # 本地开发（默认 http://localhost:5173）
npm run build      # 生产构建（tsc + vite build，输出到 dist/）
npm run preview    # 预览生产构建
node src/data/validate.mjs   # 校验 src/data 下全部 JSON 数据
```

## 技术要点

- **框架**：Vite + React 18 + TypeScript，无 UI 框架依赖，手写 CSS
- **发音**：Web Speech API（`src/hooks/useSpeech.ts` 统一封装，en-US，语速 0.75）；全站禁止直接调用 speechSynthesis
- **存储**：localStorage（`src/store.ts`）——学习进度 / 打卡记录 / 错题本 / 测验成绩，免后端
- **数据**：静态 JSON（`src/data/*.json`），类型契约在 `src/types.ts`，可用 `node src/data/validate.mjs` 校验
- **深色模式**：复习页已按 `prefers-color-scheme` 适配（在 `.rev-page` 作用域内切换 token）；如需全站深色，在 `src/styles.css` 的 `:root` 层做同样的 token 映射即可
- **移动端**：375px 宽度优先，容器 max-width 480px 居中

## 内容来源声明

本应用的学习内容（字母口诀、五大发音规则、KK 音标体系、学习建议）整理自**网络公开的学习者笔记**（周育如音标课程），仅作学习交流使用，不用于商业用途。KK 音标为美式教学体系；学校考试考 IPA 国际音标时，参照 App 内「KK ↔ IPA 对照表」替换符号即可，发音相同。
