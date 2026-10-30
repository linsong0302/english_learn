// 音标卡组页（lane5 实现）：24+ 个 KK 音标分类浏览、点读例词、卡组自测。
export default function Sounds({ onClose }: { onClose: () => void }) {
  return (
    <div className="extra-page">
      <header className="extra-header">
        <button className="extra-back" onClick={onClose}>← 返回</button>
        <b>音标总表</b>
      </header>
      <div className="card placeholder">音标卡组页实现中：元音 / 辅音 / 组合分类卡片墙、点读例词、卡组自测。</div>
    </div>
  )
}
