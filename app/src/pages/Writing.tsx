import { useEffect, useMemo, useState } from 'react'
import templatesData from '../data/writing-templates.json'
import type { WritingTemplate, WritingWork } from '../lib/writingTypes'
import { speak, speakSentences, stopSpeaking } from '../hooks/useSpeech'
import './writing.css'

const TEMPLATES = templatesData as unknown as WritingTemplate[]
const WORKS_KEY = 'kk-writings-v1'

function loadWorks(): WritingWork[] {
  try {
    const raw = localStorage.getItem(WORKS_KEY)
    const list = raw ? (JSON.parse(raw) as WritingWork[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveWorks(list: WritingWork[]) {
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(list.slice(0, 30)))
  } catch {
    // 忽略
  }
}

type View = { t: 'list' } | { t: 'detail'; tpl: WritingTemplate } | { t: 'editor'; tpl: WritingTemplate; workId?: string }

/** 已有内容的草稿（继续编辑时恢复） */
function findWork(works: WritingWork[], id?: string): WritingWork | undefined {
  return id ? works.find((w) => w.id === id) : undefined
}

// lane9 英文写作教练：模板 → 结构句式 → 仿写 → 作品管理。
export default function Writing() {
  const [view, setView] = useState<View>({ t: 'list' })
  const [works, setWorks] = useState<WritingWork[]>(loadWorks)

  // 离开页面停掉发音
  useEffect(() => stopSpeaking, [])

  const saveWork = (tpl: WritingTemplate, blocks: string[], workId?: string) => {
    let id = workId
    if (id) {
      const next = works.map((w) => (w.id === id ? { ...w, blocks, saved: Date.now() } : w))
      setWorks(next)
      saveWorks(next)
    } else {
      id = 'w' + Date.now()
      const work: WritingWork = { id, templateId: tpl.id, templateTitle: tpl.title, blocks, saved: Date.now() }
      const next = [work, ...works]
      setWorks(next)
      saveWorks(next)
    }
    return id
  }

  const removeWork = (id: string) => {
    const next = works.filter((w) => w.id !== id)
    setWorks(next)
    saveWorks(next)
  }

  if (view.t === 'editor') {
    const existing = findWork(works, view.workId)
    return (
      <Editor
        tpl={view.tpl}
        initial={existing?.blocks ?? view.tpl.blocks.map(() => '')}
        workId={view.workId}
        onBack={() => setView({ t: 'detail', tpl: view.tpl })}
        onSave={(blocks) => {
          const id = saveWork(view.tpl, blocks, view.workId)
          setView({ t: 'editor', tpl: view.tpl, workId: id })
        }}
      />
    )
  }
  if (view.t === 'detail') {
    return (
      <Detail
        tpl={view.tpl}
        onBack={() => setView({ t: 'list' })}
        onStart={(workId) => setView({ t: 'editor', tpl: view.tpl, workId })}
      />
    )
  }
  return (
    <List
      works={works}
      onOpenTpl={(tpl) => setView({ t: 'detail', tpl })}
      onOpenWork={(w) => {
        const tpl = TEMPLATES.find((t) => t.id === w.templateId)
        if (tpl) setView({ t: 'editor', tpl, workId: w.id })
      }}
      onRemoveWork={removeWork}
    />
  )
}

// ==================== 模板列表 ====================

function List({
  works,
  onOpenTpl,
  onOpenWork,
  onRemoveWork,
}: {
  works: WritingWork[]
  onOpenTpl: (tpl: WritingTemplate) => void
  onOpenWork: (w: WritingWork) => void
  onRemoveWork: (id: string) => void
}) {
  return (
    <div className="page wr-page">
      <h1>写作教练</h1>
      <p className="wr-sub">选一个模板，跟着「开头 → 中间 → 结尾」一步一步写，句式可以点读、点击插入。</p>

      <div className="wr-hero">
        <b>写作不怕，模板搭把手</b>
        <p>三步走：① 看结构 ② 抄句式换词 ③ 对照清单自查。</p>
      </div>

      <h2 className="wr-sec">模板库</h2>
      <div className="wr-grid">
        {TEMPLATES.map((tpl, i) => (
          <button key={tpl.id} className={`wr-tpl-card lv${tpl.level}`} onClick={() => onOpenTpl(tpl)}>
            <span className={`wr-tpl-ico c${i % 3}`}>{tpl.icon}</span>
            <b>{tpl.title}</b>
            <span className="wr-tpl-scene">{tpl.scene}</span>
            <span className={`wr-lv ${tpl.level === 1 ? 'l1' : 'l2'}`}>{tpl.level === 1 ? '入门' : '进阶'}</span>
          </button>
        ))}
      </div>

      <h2 className="wr-sec">我的作品（{works.length}）</h2>
      {works.length === 0 && <p className="wr-empty">还没有作品。选一个模板开始写吧！</p>}
      {works.map((w) => (
        <div key={w.id} className="wr-work-card">
          <button className="wr-work-main" onClick={() => onOpenWork(w)}>
            <b>{w.templateTitle}</b>
            <span>
              {new Date(w.saved).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ·{' '}
              {w.blocks.join(' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length} 词
            </span>
          </button>
          <button
            className="rd-mini"
            onClick={() => {
              stopSpeaking()
              speakSentences(
                w.blocks
                  .join(' ')
                  .match(/[^.!?…]+[.!?…]*/g)
                  ?.map((s) => s.trim())
                  .filter(Boolean) ?? [w.blocks.join(' ')],
                { rate: 0.8 },
              )
            }}
          >
            🔊 朗读
          </button>
          <button className="wr-del" aria-label="删除作品" onClick={() => onRemoveWork(w.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// ==================== 模板详情 ====================

function Detail({ tpl, onBack, onStart }: { tpl: WritingTemplate; onBack: () => void; onStart: (workId?: string) => void }) {
  const [showCn, setShowCn] = useState(false)
  const sampleSentences = useMemo(
    () => tpl.sample.en.split('\n').flatMap((p) => p.match(/[^.!?…]+[.!?…]*/g) ?? [p]).map((s) => s.trim()),
    [tpl],
  )
  return (
    <div className="page wr-page wr-detail">
      <header className="rd-head">
        <button className="rd-back" onClick={onBack} aria-label="返回">
          ←
        </button>
        <div className="rd-head-main">
          <b>
            {tpl.icon} {tpl.title}
          </b>
          <span>{tpl.scene}</span>
        </div>
      </header>

      <p className="wr-intro">{tpl.intro}</p>

      {tpl.blocks.map((b, i) => (
        <div key={i} className="card wr-block">
          <div className="wr-block-head">
            <span className="wr-step">{i + 1}</span>
            <b>{b.label}</b>
            <span className="wr-block-hint">{b.hint}</span>
          </div>
          <div className="wr-starters">
            {b.starters.map((s, j) => (
              <button key={j} className="wr-starter" onClick={() => speak(s, { rate: 0.8 })} title="点击听这句">
                🔊 {s}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="card wr-sample">
        <div className="wr-sample-head">
          <b>范文</b>
          <div className="wr-sample-btns">
            <button className="rd-mini" onClick={() => setShowCn(!showCn)}>
              {showCn ? '隐藏中文' : '看中文'}
            </button>
            <button
              className="rd-mini"
              onClick={() => {
                stopSpeaking()
                speakSentences(sampleSentences, { rate: 0.8 })
              }}
            >
              🔊 读范文
            </button>
          </div>
        </div>
        <p className="wr-sample-en">{tpl.sample.en}</p>
        {showCn && <p className="wr-sample-cn">{tpl.sample.cn}</p>}
      </div>

      <button className="btn btn-warm btn-block" onClick={() => onStart()}>
        ✍️ 开始仿写
      </button>
      <p className="rd-tip">范文只能参考，写出你自己的生活才是最棒的！</p>
    </div>
  )
}

// ==================== 仿写器 ====================

function Editor({
  tpl,
  initial,
  workId,
  onBack,
  onSave,
}: {
  tpl: WritingTemplate
  initial: string[]
  workId?: string
  onBack: () => void
  onSave: (blocks: string[]) => void
}) {
  const [blocks, setBlocks] = useState<string[]>(initial)
  const [checks, setChecks] = useState<Set<number>>(new Set())

  const words = useMemo(
    () => blocks.join(' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    [blocks],
  )

  const setBlock = (i: number, v: string) => {
    setBlocks((s) => s.map((b, j) => (j === i ? v : b)))
  }

  const insertStarter = (i: number, s: string) => {
    const base = blocks[i]?.trim() ?? ''
    const piece = s.replace(/__+/g, '____ ')
    setBlock(i, base ? base.replace(/\s*$/, '') + ' ' + piece : piece)
  }

  const preview = blocks.map((b) => b.trim()).filter(Boolean).join(' ')

  return (
    <div className="page wr-page wr-editor">
      <header className="rd-head">
        <button className="rd-back" onClick={onBack} aria-label="返回">
          ←
        </button>
        <div className="rd-head-main">
          <b>
            {tpl.icon} 仿写：{tpl.title}
          </b>
          <span>一共 {words} 个词 · 写完记得自查</span>
        </div>
      </header>

      {tpl.blocks.map((b, i) => (
        <div key={i} className="card wr-block">
          <div className="wr-block-head">
            <span className="wr-step">{i + 1}</span>
            <b>{b.label}</b>
            <span className="wr-block-hint">{b.hint}</span>
          </div>
          <textarea
            className="wr-area"
            rows={3}
            value={blocks[i] ?? ''}
            placeholder={'试一试：' + b.starters[0]}
            onChange={(e) => setBlock(i, e.target.value)}
          />
          <div className="wr-starters">
            {b.starters.map((s, j) => (
              <span key={j} className="wr-starter-row">
                <button className="wr-starter" onClick={() => speak(s.replace(/__+/g, 'something'), { rate: 0.8 })} title="点击听这句">
                  🔊
                </button>
                <button className="wr-starter wr-insert" onClick={() => insertStarter(i, s)} title="点击插入到我的作文">
                  {s}
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}

      {preview && (
        <div className="card wr-preview">
          <b>我的作文（{words} 词）</b>
          <p>{preview}</p>
        </div>
      )}

      <div className="card wr-checklist">
        <b>写完自查 ✓</b>
        {tpl.checklist.map((c, i) => (
          <label key={i} className="wr-check">
            <input
              type="checkbox"
              checked={checks.has(i)}
              onChange={() =>
                setChecks((s) => {
                  const n = new Set(s)
                  if (n.has(i)) n.delete(i)
                  else n.add(i)
                  return n
                })
              }
            />
            {c}
          </label>
        ))}
      </div>

      <div className="wr-editor-btns">
        <button className="btn btn-warm" onClick={() => onSave(blocks)} disabled={words < 3}>
          保存作品
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            stopSpeaking()
            const sents = preview.match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) ?? []
            if (sents.length) speakSentences(sents, { rate: 0.75 })
          }}
          disabled={!preview}
        >
          🔊 读我的作文
        </button>
      </div>
      {workId && <p className="wr-saved-tip">已保存过这个作品，再点「保存作品」会更新它。</p>}
    </div>
  )
}
