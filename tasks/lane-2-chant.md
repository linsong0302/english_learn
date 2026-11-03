# Lane 2 — 口诀与音标核心页（前端基础）

> 拥有：`app/src/pages/Home.tsx`、`app/src/pages/Chant.tsx`、`app/src/components/`、`app/src/hooks/useSpeech.ts`、`app/src/styles.css`，以及本 lane 页面的专属 css。
> 🔒 禁改：App.tsx / main.tsx / index.html / package.json / tsconfig / vite.config / 其他 lane 的文件。
> styles.css 只放全局 token 与通用样式；页面专属样式另建 css 文件自行 import。

- [x] 完善 `src/hooks/useSpeech.ts`：speak(text, opts) 支持 rate 默认 0.75、优先选 en-US 语音、语音列表异步加载兼容（voiceschanged）、iOS/Safari 首次交互解锁（unlockSpeech）、播放前 cancel 防重叠；导出 speakLetter / speakWord 便捷方法；暴露 `supported` 标志供 UI 降级提示
- [x] 全局视觉设计系统：styles.css 定义颜色 token（建议暖黄 + 深蓝，友好童趣）、卡片、大按钮（含发音按钮通用样式 .btn-speak）、Tab 栏；375px 优先，max-width 480px 居中
- [x] 首页 Home：今日任务卡（早/晚朗读打卡，调用 store 的 todayCheckin / toggleCheckin 展示状态并跳转复习 Tab 的提示文案）、学习进度总览（seenLetters 数、quizRounds 正确率、streakDays）、四大板块入口卡、课程理念卡（100 词 = 90 口诀 + 5 规则 + 5 排除 的比喻）
- [x] 口诀页 Chant：26 字母卡片墙（大写字母、KK 音标、联想汉字、sample 例词 + 发音按钮）；l/m/n/r 显示「前/后」两种读法切换；点卡片开单字母详情浮层（tips 口型提示、2+2 跟读按钮：先播字母音×2 再播例词音×2，中间留间隔）
- [x] 口诀连读模式：a→z 顺序自动播放（每个字母播 2+2），可暂停/继续/手动下一个；底部进度点显示当前字母；播放完提示「读完 1 遍，建议读满 20 遍」
- [x] 冲刺：单字母详情浮层加「跟读对比」：MediaRecorder 录自己朗读并回放，与 TTS 播放并排两个按钮（无麦克风权限时优雅降级隐藏）
- [x] 停顿控制升级（字母间停不停顿自己定）：去掉「连读/分段」二选一，2+2 跟读统一为「字母 → 间隔 → 字母 → 间隔 → 音标」拼播；ChantSettings 两个间隔滑动条常显，默认 250/350ms（有逗号停顿感），两个间隔都拖到 0 秒时改播整句录音（像老师带读一样连读）。useSpeech.ts 移除 mode/ChantMode（voice 与间隔设置保留兼容），涉及 useSpeech.ts + ChantSettings.tsx
- [x] useSpeech.ts 新增 speakCombo(pattern, opts)：从组合名提取英文字母（去掉（…）中文注释，如 th（清）→ th），用所选音色单字母录音按 letterGapMs 依次朗读，录音缺失退回系统 TTS 逐字母读；供规则页组合表点读使用（音标符号 /θ/ 等 TTS 读不出来，改读组成字母的字母名）
- [x] 音标点读基础：useSpeech.ts 新增 speakPhoneme(audio, fallbackWord?)
- [x] 真正可控的 0 间隔拼读：录音首尾有 TTS 静音垫
- [x] 叠字联想也可拆：「啵啵」是一条录音、内部停顿烤死的。新增 ChantSettings 第三根滑条「叠字间隔」（ChantSettings.hanziGapMs，默认 0=自然连读）；useSpeech 在 Web Audio 链路里把叠字剪辑从中点 30%~70% 区间最安静的 20ms 窗（峰值 ≤0.08，真停顿才切，切不破字）切成两半，按叠字间隔精确排程「啵，啵」；speakLetterAndPhoneme 三个间隙全部可控；说明文案改为三处间隔动态说明（单字母约 1.18 秒，实际读音约 0.4 秒），旧逻辑即使间隔 0 也分不开，且 0/0 兜底整句录音自带逗号停顿。改为 Web Audio 方案：解码后裁掉首尾静音（阈值 0.012、各留 30ms），AudioContext 按毫秒精确排程字母→字母→联想字；speakLetterAndPhoneme 与 speakCombo 都走该链路，解码失败退回 TTS/原路径；ChantSettings 提示文案按「BB啵啵 / BB，啵啵 / B，B，啵啵」三种格式动态说明；stopSpeaking 同时停掉已排程的 Web Audio 节点——播 public/audio/phoneme/{audio}.mp3，录音缺失（未生成/加载失败）自动退回读例词；新增 app/scripts/gen-phoneme-audio.mjs（零依赖 Node 脚本：读 phonemes.json 的 audio 字段，用 Azure SSML `<phoneme alphabet="ipa">` 批量合成 41 个音标本音 mp3，支持 --list/--force/--voice）和 app/scripts/README.md（Azure 免费 key 申请与运行说明）。浏览器 TTS 只接受纯文本不支持 SSML，音标符号必须离线预合成（方案 A）
- [x] 音标本音开箱可用：新增 scripts/gen-phoneme-audio-sapi.ps1（Windows 自带 SAPI + SSML phoneme alphabet="sapi"，Zira 按音素合成 24kHz wav，峰值归一到 26000 修正擦音过轻；失败清理半成品文件），生成 41 个 wav 已入库；speakPhoneme 播放链改为 mp3（Azure）→ wav（SAPI）→ 例词；README 更新双脚本说明
- [x] 修复塞音本音听感：SAPI 单独合成 b/d/g/k/p/t 只有约 100ms 爆破声，不像可跟读的音；SYMS 映射改为「声母 + ax（schwa）」（duh/buh/tuh...，自然拼读标准示范方式），重生成 6 个 wav（有声段 0.28-0.33s，峰值归一保留）
- [x] 修复 D 的联想字读音：「的的」是多音字（de/dí/dì），打包录音读错；用中文语音（Huihui）以「德德」定音重新合成 dé dé，输出 public/audio/chant/{voice}/d-hanzi.wav（6 个音色目录）；useSpeech 的口诀/例词加载加 mp3→wav 兜底链（chantFileUrls + playChantAudioAny + trimmedBuffer 支持多地址），仅 d 需要修（其余汉字皆单音字）
- [x] 音标本音 /d/ 改拼音味：按用户要求把 phoneme/d.wav 从英语式 duh 改为拼音 dē（第一声），用 Huihui 合成候选（嘚=U+5628 / 德=U+5FB7）并做基频（F0）分析挑平调的那条
- [x] 新音标本音合成：SAPI 脚本 SYMS 增加 ngg='ng g ax'、ngk='ng k ax'、ar='aa r'，生成 ngg/ngk/ar 三个 wav（ngk 包络为「嗯」+「克」两段）
