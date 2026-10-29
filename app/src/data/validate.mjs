// 数据校验脚本：node validate.mjs（在本文件所在目录或任意目录直接运行）
// 校验 app/src/data 下全部 JSON 的结构与内容约定，通过打印 OK，失败列出问题并退出码 1。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const MIN_WORDS = 80 // words.json 最少词数
const MIN_KK_IPA_ROWS = 4 // kk-ipa.json 最少行数（后续扩充后调高）

const errors = []

function load(name) {
  try {
    return JSON.parse(readFileSync(join(here, name), 'utf8'))
  } catch (e) {
    errors.push(`${name}: JSON 解析失败 - ${e.message}`)
    return null
  }
}

const isStr = (v) => typeof v === 'string'
const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0
const isArr = (v) => Array.isArray(v)
// KK 音标统一写成 /…/ 的形式
const isKk = (v) => isStr(v) && v.startsWith('/') && v.endsWith('/') && v.length > 2

function checkLetters() {
  const letters = load('letters.json')
  if (!letters) return
  if (!isArr(letters)) return errors.push('letters.json: 顶层应为数组')
  if (letters.length !== 26) errors.push(`letters.json: 应恰好 26 项，实际 ${letters.length} 项`)
  const az = 'abcdefghijklmnopqrstuvwxyz'.split('')
  const seen = new Set()
  letters.forEach((l, i) => {
    const at = `letters.json[${i}]`
    if (!l || typeof l !== 'object') return errors.push(`${at}: 应为对象`)
    if (!az.includes(l.letter)) errors.push(`${at}.letter "${l.letter}" 不是小写 a-z`)
    if (seen.has(l.letter)) errors.push(`${at}: 字母 "${l.letter}" 重复`)
    seen.add(l.letter)
    if (l.upper !== l.letter.toUpperCase()) errors.push(`${at}.upper "${l.upper}" 与大小写不匹配`)
    if (!isKk(l.kk)) errors.push(`${at}.kk "${l.kk}" 应为 /…/ 形式`)
    if (!isNonEmptyStr(l.hint)) errors.push(`${at}.hint 不能为空`)
    if (!isNonEmptyStr(l.sample)) errors.push(`${at}.sample 不能为空`)
    if (l.tips !== undefined && !(isArr(l.tips) && l.tips.every(isStr)))
      errors.push(`${at}.tips 应为字符串数组`)
    if (l.variants !== undefined) {
      if (!isArr(l.variants)) errors.push(`${at}.variants 应为数组`)
      else
        l.variants.forEach((v, j) => {
          const vat = `${at}.variants[${j}]`
          if (!['initial', 'final'].includes(v.position))
            errors.push(`${vat}.position "${v.position}" 应为 initial 或 final`)
          if (!isKk(v.kk)) errors.push(`${vat}.kk "${v.kk}" 应为 /…/ 形式`)
          if (!isNonEmptyStr(v.hint)) errors.push(`${vat}.hint 不能为空`)
        })
    }
  })
  // l/m/n/r 必须有前/后两种读法
  for (const letter of ['l', 'm', 'n', 'r']) {
    const l = letters.find((x) => x && x.letter === letter)
    if (!l) continue
    const positions = isArr(l.variants) ? l.variants.map((v) => v.position).sort() : []
    if (JSON.stringify(positions) !== JSON.stringify(['final', 'initial']))
      errors.push(`letters.json: 字母 "${letter}" 缺少 initial/final 两种读法`)
  }
  return letters
}

function checkRules() {
  const rules = load('rules.json')
  if (!rules) return
  if (!isArr(rules)) return errors.push('rules.json: 顶层应为数组')
  const expectedIds = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5']
  const gotIds = rules.map((r) => r && r.id)
  if (JSON.stringify(gotIds) !== JSON.stringify(expectedIds))
    errors.push(`rules.json: id 顺序应为 ${expectedIds.join(',')}，实际 ${gotIds.join(',')}`)
  rules.forEach((r, i) => {
    const at = `rules.json[${i}]`
    if (!r || typeof r !== 'object') return errors.push(`${at}: 应为对象`)
    for (const f of ['title', 'summary', 'detail'])
      if (!isNonEmptyStr(r[f])) errors.push(`${at}.${f} 不能为空`)
    if (!(isArr(r.examples) && r.examples.length >= 1))
      errors.push(`${at}.examples 应为非空数组`)
    else
      r.examples.forEach((e, j) => {
        const eat = `${at}.examples[${j}]`
        if (!isNonEmptyStr(e.word)) errors.push(`${eat}.word 不能为空`)
        if (!isKk(e.kk)) errors.push(`${eat}.kk "${e.kk}" 应为 /…/ 形式`)
        if (!isStr(e.note)) errors.push(`${eat}.note 应为字符串`)
      })
    if (!(isArr(r.mouthTips) && r.mouthTips.every(isStr) && r.mouthTips.length >= 1))
      errors.push(`${at}.mouthTips 应为非空字符串数组`)
    if (!(isArr(r.commonMistakes) && r.commonMistakes.every(isStr) && r.commonMistakes.length >= 1))
      errors.push(`${at}.commonMistakes 应为非空字符串数组`)
    if (!isNonEmptyStr(r.mnemonic)) errors.push(`${at}.mnemonic（记忆口诀）不能为空`)
    if (r.id === 'rule5') {
      if (!(isArr(r.combos) && r.combos.length >= 1)) errors.push(`${at}.combos 应为非空数组`)
      else
        r.combos.forEach((c, j) => {
          const cat = `${at}.combos[${j}]`
          if (!isNonEmptyStr(c.pattern)) errors.push(`${cat}.pattern 不能为空`)
          if (!isKk(c.kk)) errors.push(`${cat}.kk "${c.kk}" 应为 /…/ 形式`)
          if (!(isArr(c.examples) && c.examples.length >= 1))
            errors.push(`${cat}.examples 应为非空数组`)
          else
            c.examples.forEach((e, k) => {
              if (!isNonEmptyStr(e.word)) errors.push(`${cat}.examples[${k}].word 不能为空`)
              if (!isKk(e.kk)) errors.push(`${cat}.examples[${k}].kk "${e.kk}" 应为 /…/ 形式`)
            })
          if (!isNonEmptyStr(c.note)) errors.push(`${cat}.note 不能为空`)
        })
    } else if (r.combos !== undefined) {
      errors.push(`${at}: 仅 rule5 允许有 combos`)
    }
  })
  return rules
}

function checkWords(rules) {
  const words = load('words.json')
  if (!words) return
  if (!isArr(words)) return errors.push('words.json: 顶层应为数组')
  if (words.length < MIN_WORDS)
    errors.push(`words.json: 至少 ${MIN_WORDS} 个单词，实际 ${words.length} 个`)
  const validRules = new Set(['rule1', 'rule2', 'rule3', 'rule4', 'rule5', 'none'])
  const ruleIds = new Set(isArr(rules) ? rules.map((r) => r && r.id) : [])
  const seen = new Set()
  words.forEach((w, i) => {
    const at = `words.json[${i}]`
    if (!w || typeof w !== 'object') return errors.push(`${at}: 应为对象`)
    if (!isNonEmptyStr(w.word)) errors.push(`${at}.word 不能为空`)
    else {
      if (w.word !== w.word.toLowerCase()) errors.push(`${at}.word "${w.word}" 应为小写`)
      if (seen.has(w.word)) errors.push(`${at}: 单词 "${w.word}" 重复`)
      seen.add(w.word)
    }
    if (!isKk(w.kk)) errors.push(`${at}.kk "${w.kk}" 应为 /…/ 形式`)
    if (!validRules.has(w.rule)) errors.push(`${at}.rule "${w.rule}" 应为 rule1..rule5 或 none`)
    if (w.rule && w.rule !== 'none' && ruleIds.size > 0 && !ruleIds.has(w.rule))
      errors.push(`${at}.rule "${w.rule}" 在 rules.json 中不存在`)
    if (![1, 2, 3].includes(w.level)) errors.push(`${at}.level "${w.level}" 应为 1-3`)
  })
  return words
}

function checkKkIpa(words) {
  const rows = load('kk-ipa.json')
  if (!rows) return
  if (!isArr(rows)) return errors.push('kk-ipa.json: 顶层应为数组')
  if (rows.length < MIN_KK_IPA_ROWS)
    errors.push(`kk-ipa.json: 至少 ${MIN_KK_IPA_ROWS} 行，实际 ${rows.length} 行`)
  const wordSet = new Set(isArr(words) ? words.map((w) => w && w.word) : [])
  rows.forEach((r, i) => {
    const at = `kk-ipa.json[${i}]`
    if (!r || typeof r !== 'object') return errors.push(`${at}: 应为对象`)
    if (!isNonEmptyStr(r.word)) errors.push(`${at}.word 不能为空`)
    else if (wordSet.size > 0) {
      // "word（中的 x）" 里的括号前是主例词，应能在词库中找到
      const main = r.word.split('（')[0]
      if (!wordSet.has(main)) errors.push(`${at}.word "${r.word}" 的例词 "${main}" 不在 words.json 中`)
    }
    if (!isKk(r.kk)) errors.push(`${at}.kk "${r.kk}" 应为 /…/ 形式`)
    if (!isKk(r.ipa)) errors.push(`${at}.ipa "${r.ipa}" 应为 /…/ 形式`)
    if (r.note !== undefined && !isStr(r.note)) errors.push(`${at}.note 应为字符串`)
  })
}

function main() {
  const rules = checkRules()
  const words = checkWords(rules)
  checkKkIpa(words)
  checkLetters()

  if (errors.length > 0) {
    console.error(`数据校验未通过，共 ${errors.length} 个问题：`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log('OK')
}

main()
