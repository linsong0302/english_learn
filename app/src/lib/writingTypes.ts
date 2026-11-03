// 英文写作教练的数据契约（lane9 所有）。

/** 写作模板的一个结构段（开头 / 中间 / 结尾…） */
export interface WritingBlock {
  label: string
  /** 这一段写什么的提示 */
  hint: string
  /** 常用句式（带 ___ 空位的模板句，可点读、点击插入仿写） */
  starters: string[]
}

/** 写作模板：教「怎么写」的骨架 + 范文（原创）+ 自查清单 */
export interface WritingTemplate {
  id: string
  title: string
  /** 适用场景 */
  scene: string
  level: 1 | 2
  icon: string
  /** 一句话介绍这个模板练什么 */
  intro: string
  blocks: WritingBlock[]
  /** 范文（原创） */
  sample: { en: string; cn: string }
  /** 写完后的自查清单 */
  checklist: string[]
}

/** 已保存的作品（存 localStorage） */
export interface WritingWork {
  id: string
  templateId: string
  templateTitle: string
  /** 与模板 blocks 对齐的各段内容 */
  blocks: string[]
  saved: number
}
