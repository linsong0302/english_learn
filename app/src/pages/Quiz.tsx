import words from '../data/words.json'

// lane3 负责实现完整练习页：看词选音标 / 听音选词 / 判断规则，每轮 10 题。
export default function Quiz() {
  return (
    <div className="page">
      <h1>练习</h1>
      <div className="card placeholder">练习页完整版实现中：三种题型、即时反馈、错题进错题本。</div>
      <div className="card">当前词库 {words.length} 词</div>
    </div>
  )
}
