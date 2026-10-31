# 音标音频生成脚本（gen-phoneme-audio.mjs）

给 41 个 KK 音标生成「本音」录音到 `app/public/audio/phoneme/{audio}.mp3`，供 `useSpeech.ts` 的 `speakPhoneme` 播放（音标总表卡片 🔊、规则 5 组合点读）。

**没有这些文件也能正常用**：页面会自动退回读第一个例词（和以前的行为一致），所以录音可以随时后补。

## 为什么需要预合成

浏览器的 `speechSynthesis` 只接受普通文本，**不支持 SSML 的 `<phoneme>` 标签**，所以 `/θ/`、`/tʃ/` 这类音标符号读不出来。业内的标准做法是用云端 TTS 按 IPA 音素合成（Azure / Polly 都支持），这里选 Azure：离线批量生成一次，之后 app 保持完全离线可用。

## 使用步骤

1. 注册 Azure（有免费额度 F0：每月 50 万字符神经合成，足够用很多次），创建一个「语音服务（Speech）」资源，拿到 **密钥（Key）** 和 **区域（Region）**，比如 `eastus`。
2. 在 `app/` 目录运行（把 `--region` 换成你的资源区域）：

   ```bash
   node scripts/gen-phoneme-audio.mjs --key <你的密钥> --region eastus
   ```

3. 生成的 41 个 mp3 在 `app/public/audio/phoneme/`，正常 `npm run build`（或 `npm run cap:sync`）后即可点读音标本音。
4. 只想看看会生成哪些文件（不需要 key）：`node scripts/gen-phoneme-audio.mjs --list`

可选项：`--voice`（默认 `en-US-AnaNeural` 英文童声，和口诀例词录音一致）、`--rate`（默认 `-15%`，音素很短放慢更清楚）、`--force`（覆盖已生成的文件）、`--out`（自定义输出目录）。

## 个别符号报错怎么办

Azure 对个别 IPA 符号可能返回 HTTP 400。脚本顶部有 `IPA_OVERRIDE` 表，把该符号（phonemes.json 的 id，不带斜线）改写成 Azure 支持的等价写法即可，注释里有示例。改完重跑（默认跳过已成功的文件）。

## 与现有录音的关系

- `public/audio/chant/{voice}/`：口诀字母/音标联想字录音（6 种音色，按所选音色播放）
- `public/audio/word/{enDir}/`：英文例词录音（按所选音色对应的英文声）
- `public/audio/phoneme/`：音标本音录音（只出一套，用英文童声；不随「朗读语音」设置变化）
