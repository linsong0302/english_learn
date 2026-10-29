import letters from '../data/letters.json'
import rules from '../data/rules.json'
import words from '../data/words.json'

// lane2 负责实现完整首页：今日任务卡、进度总览、板块入口、课程理念。
export default function Home() {
  return (
    <div className="page">
      <h1>KK 音标学习</h1>
      <div className="card">
        <p>一个口诀 + 五个规则，100 个生词轻松拆：90 个靠口诀，5 个靠规则，5 个靠排除。</p>
        <p className="placeholder">
          内容规模：{letters.length} 个字母口诀 · {rules.length} 条规则 · {words.length} 个练习词
        </p>
      </div>
      <div className="card placeholder">首页完整版实现中：今日任务卡、学习进度总览、四大板块入口。</div>
    </div>
  )
}
