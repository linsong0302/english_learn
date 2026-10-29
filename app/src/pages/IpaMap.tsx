import rows from '../data/kk-ipa.json'

// lane4 负责实现完整 KK/IPA 对照：差异高亮、使用建议。
export default function IpaMap() {
  return (
    <div className="card">
      <b>KK ↔ IPA 对照</b>
      {rows.map((r, i) => (
        <p key={i}>
          {r.word}：KK {r.kk} / IPA {r.ipa}
        </p>
      ))}
    </div>
  )
}
