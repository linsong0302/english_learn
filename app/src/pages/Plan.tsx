// 七天学习计划页（lane7 实现）：每日任务清单、自动打勾、总进度。
export default function Plan({ onClose }: { onClose: () => void }) {
  return (
    <div className="extra-page">
      <header className="extra-header">
        <button className="extra-back" onClick={onClose}>← 返回</button>
        <b>七天计划</b>
      </header>
      <div className="card placeholder">七天学习计划实现中：每天 3-5 个任务，练完自动/手动打勾。</div>
    </div>
  )
}
