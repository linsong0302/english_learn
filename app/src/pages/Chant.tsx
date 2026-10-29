import letters from '../data/letters.json'

// lane2 负责实现完整口诀页：26 字母卡片墙、l/m/n/r 前后读法、2+2 跟读、连读模式。
export default function Chant() {
  return (
    <div className="page">
      <h1>字母口诀</h1>
      <div className="card placeholder">口诀页完整版实现中：卡片墙、前后读法切换、2+2 跟读。</div>
      <div className="card">
        {letters.map((l) => (
          <span key={l.letter} style={{ marginRight: 10, display: 'inline-block' }}>
            <b>{l.upper}</b> {l.kk} {l.hint}
          </span>
        ))}
      </div>
    </div>
  )
}
