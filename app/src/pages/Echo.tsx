// 跟读打分页（lane6 实现）：语音识别跟读、相似度打分、连续练习。
export default function Echo({ onClose }: { onClose: () => void }) {
  return (
    <div className="extra-page">
      <header className="extra-header">
        <button className="extra-back" onClick={onClose}>← 返回</button>
        <b>跟读打分</b>
      </header>
      <div className="card placeholder">跟读打分实现中：听示范 → 跟着说 → 识别打分（⭐ 评级）。</div>
    </div>
  )
}
