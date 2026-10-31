// 音标卡组数据契约（lane5 所有）：KK 音标分类浏览 + 点读 + 卡组自测。
// 音标符号本身无法被浏览器 TTS 朗读；「本音」靠 scripts/gen-phoneme-audio.mjs
// 预合成的 audio 录音播放，录音缺失时页面退回读例词。

export interface PhonemeExample {
  word: string // 例词（优先取自 words.json，保证点读发音准确）
  kk: string // 该词完整音标，如 "/kæt/"
}

/** 单个 KK 音标 */
export interface Phoneme {
  id: string // 音标符号（去斜线），如 "æ"、"p"、"tʃ"、"kw"
  kk: string // 带斜线的展示形式，如 "/æ/"
  type: 'vowel' | 'consonant' | 'combo' // 元音 / 辅音 / 组合
  tip: string // 一句口型提示（表述参考 letters.json / rules.json 已有文案）
  examples: PhonemeExample[] // 例词 2-3 个，第一个作为「听示范」的朗读词
  audio?: string // 音标本音录音文件名（ASCII，不含扩展名），对应 public/audio/phoneme/{audio}.mp3
}
