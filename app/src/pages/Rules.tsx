import rules from '../data/rules.json'

// lane3 负责实现完整规则页：讲解、例词点读、辅音组合表、小测验。
export default function Rules() {
  return (
    <div className="page">
      <h1>五大规则</h1>
      {rules.map((r) => (
        <div key={r.id} className="card">
          <b>{r.title}</b>
          <p>{r.summary}</p>
        </div>
      ))}
      <div className="card placeholder">规则页完整版实现中：例词点读、小测验。</div>
    </div>
  )
}
