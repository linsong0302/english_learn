import rows from '../data/kk-ipa.json'
import type { KkIpaRow } from '../types'
import { speakWord } from '../hooks/useSpeech'
import './ipamap.css'

// lane4：KK ↔ IPA 对照表。数据渲染做了容错：字段缺失时用默认值，不让页面崩。
export default function IpaMap() {
  const list: KkIpaRow[] = Array.isArray(rows) ? (rows as KkIpaRow[]) : []

  return (
    <div className="rev-ipa">
      {/* 顶部说明卡 */}
      <div className="card rev-ipa-intro">
        <div className="rev-ipa-intro-title">KK ↔ IPA 对照表</div>
        <p className="rev-ipa-intro-text">
          老师课上教的是 <b>KK 音标</b>（美式），学校考试考 <b>IPA 国际音标</b>。
          把 KK 符号按这张表<b>对照替换</b>即可，<b>发音完全相同</b>，不用重新学。
        </p>
        <p className="rev-ipa-intro-sub">黄色高亮 = 两边写法不同，考试时要留心替换。</p>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <p className="rev-ipa-empty">对照表数据还没有加载到，稍后再来看看。</p>
        </div>
      ) : (
        <div className="card rev-ipa-table-card">
          <table className="rev-ipa-table">
            <thead>
              <tr>
                <th>例词</th>
                <th>KK</th>
                <th>IPA</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => {
                const kk = r?.kk ?? '—'
                const ipa = r?.ipa ?? '—'
                const word = r?.word ?? ''
                const say = word.split('（')[0]?.trim() || word
                const note = r?.note ?? ''
                const diff = kk !== ipa
                return (
                  <tr key={i} className={diff ? 'diff' : 'same-row'}>
                    <td>
                      <div className="rev-ipa-word-line">
                        {say && (
                          <button
                            className="rev-ipa-say"
                            onClick={() => speakWord(say)}
                            aria-label={`读 ${say}`}
                          >
                            🔊
                          </button>
                        )}
                        <b className="rev-ipa-word">{word}</b>
                      </div>
                      {note && <span className="rev-ipa-note">{note}</span>}
                    </td>
                    <td className="rev-ipa-cell">{kk}</td>
                    <td className="rev-ipa-cell">{diff ? ipa : <span className="rev-ipa-same">相同</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
