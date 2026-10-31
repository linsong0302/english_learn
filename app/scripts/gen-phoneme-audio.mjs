#!/usr/bin/env node
// 音标音频批量生成：读取 src/data/phonemes.json，用 Azure 语音服务的 SSML <phoneme>
// 按 IPA 音素逐个合成 mp3，输出到 public/audio/phoneme/{audio}.mp3。
// 浏览器 speechSynthesis 只接受纯文本、不支持 SSML，音标符号（/θ/ 等）读不出来，
// 所以离线预合成一次、永久离线使用。用法见同目录 README.md。零第三方依赖（Node 18+）。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const has = (name) => args.includes(name)
const argOf = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const OUT_DIR = resolve(appRoot, argOf('--out', 'public/audio/phoneme'))
const VOICE = argOf('--voice', 'en-US-AnaNeural') // 与口诀英文例词同一童声
const RATE = argOf('--rate', '-15%') // 音素很短，放慢一点更清楚
const KEY = argOf('--key')
const REGION = argOf('--region', 'eastus')

// Azure 对个别 IPA 符号可能不认（报 HTTP 400），在这里把「去斜线的 kk」改写成它支持的写法。
const IPA_OVERRIDE = {
  // ɝ: 'ɜr',
}

const phonemes = JSON.parse(readFileSync(join(appRoot, 'src/data/phonemes.json'), 'utf8'))
// audio 文件名还没加的数据条目跳过并提示（audio 字段由数据侧维护）
const missing = phonemes.filter((p) => !p.audio)
const list = phonemes
  .filter((p) => p.audio)
  .map((p) => ({ ...p, ipa: IPA_OVERRIDE[p.id] ?? p.id }))

// 唯一性自检：文件名重复会互相覆盖
{
  const dup = list.map((p) => p.audio).filter((a, i, arr) => arr.indexOf(a) !== i)
  if (dup.length) {
    console.error(`audio 文件名重复：${[...new Set(dup)].join('、')}`)
    process.exit(1)
  }
}

if (has('--list')) {
  list.forEach((p) => console.log(`${p.audio}.mp3\t${p.kk}\t${p.type}\t${p.examples[0]?.word ?? ''}`))
  if (missing.length) console.warn(`\n提示：${missing.length} 条缺 audio 字段未列入（${missing.map((p) => p.kk).join('、')}）`)
  console.log(`\n共 ${list.length} 个；语音：${VOICE}（--voice 可换）`)
  process.exit(0)
}

if (!KEY) {
  console.error('缺少 --key <Azure语音服务密钥>。申请步骤见 scripts/README.md')
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })

let okCount = 0
const failed = []
for (const p of list) {
  const file = join(OUT_DIR, `${p.audio}.mp3`)
  if (!has('--force') && existsSync(file)) {
    console.log(`跳过（已存在） ${p.audio}.mp3  ${p.kk}`)
    okCount++
    continue
  }
  // <phoneme> 让引擎按 ph 里的 IPA 发音；封闭文本用音标符号本身（发音被 ph 覆盖）
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${VOICE}"><prosody rate="${RATE}">` +
    `<phoneme alphabet="ipa" ph="${p.ipa}">${p.id}</phoneme>` +
    `</prosody></voice></speak>`
  try {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'kk-phoneme-audio-gen',
      },
      body: ssml,
    })
    if (!res.ok) {
      failed.push(`${p.kk}: HTTP ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300))
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1000) {
      failed.push(`${p.kk}: 返回内容过短（${buf.length} 字节），疑似空音频`)
      continue
    }
    writeFileSync(file, buf)
    okCount++
    console.log(`生成 ${p.audio}.mp3  ${p.kk}  (${buf.length} 字节)`)
  } catch (e) {
    failed.push(`${p.kk}: ${e?.message ?? e}`)
  }
}

console.log(`\n完成 ${okCount}/${list.length}，输出目录 ${OUT_DIR}`)
if (failed.length) {
  console.error(`\n失败 ${failed.length} 个：\n${failed.join('\n')}`)
  process.exit(2)
}
