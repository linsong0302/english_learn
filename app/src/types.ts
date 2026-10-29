// 数据契约：所有 JSON 数据的类型定义（仅 lane1 可增量扩展）。
// 改动结构必须同步对应 JSON，并保证 npm run build 通过。

export interface LetterVariant {
  /** 在单词中的位置：前 / 后（仅 l/m/n/r 有两种读法） */
  position: 'initial' | 'final'
  kk: string
  hint: string
}

export interface LetterSound {
  letter: string // 小写字母，如 "b"
  upper: string // 大写字母，如 "B"
  kk: string // 最常见 KK 音标，如 "/b/"
  hint: string // 联想汉字提示
  sample: string // 例词（发音含该音标）
  tips?: string[] // 口型 / 发音要点
  variants?: LetterVariant[] // l/m/n/r 的前后两种读法
}

export interface RuleExample {
  word: string
  kk: string
  note: string
}

/** 规则 5 的辅音组合 */
export interface RuleCombo {
  pattern: string // 如 "th（清）"
  kk: string
  examples: { word: string; kk: string }[]
  note: string
}

export interface PronRule {
  id: string // "rule1".."rule5"
  title: string
  summary: string // 一句话总结
  detail: string // 讲解
  examples: RuleExample[]
  combos?: RuleCombo[] // 仅规则 5 使用
  mouthTips?: string[] // 口型要点
  commonMistakes?: string[] // 常见错误
  mnemonic?: string // 中文记忆口诀句
}

export interface Word {
  word: string
  kk: string
  rule: string // "rule1".."rule5" 或 "none"
  level: 1 | 2 | 3 // 1 简单 → 3 稍难
}

export interface KkIpaRow {
  word: string
  kk: string
  ipa: string
  note?: string
}
