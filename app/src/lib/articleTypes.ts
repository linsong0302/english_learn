// 英文文章阅读的数据契约（lane8 所有）。

/** 内置分级短文：全部原创编写（不拷贝版权文章），自带每段参考译文，离线可用 */
export interface Article {
  id: string
  title: string
  /** 来源/分级说明，如「原创分级短文 · Level 1」 */
  source: string
  level: 1 | 2
  /** 每段 = 句子数组（朗读与高亮按句进行） */
  paragraphs: string[][]
  /** 每段参考译文，与 paragraphs 一一对应 */
  translation: string[]
  /** 重点词 → 中文释义（key 一律小写） */
  glossary: Record<string, string>
}

/** 用户粘贴的自定义文章（存 localStorage） */
export interface CustomArticle {
  id: string
  title: string
  /** 原文（空行分段） */
  text: string
  added: number
}
