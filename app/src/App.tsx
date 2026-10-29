import { useState } from 'react'
import Home from './pages/Home'
import Chant from './pages/Chant'
import Rules from './pages/Rules'
import Quiz from './pages/Quiz'
import Review from './pages/Review'

const TABS = [
  { key: 'home', label: '首页' },
  { key: 'chant', label: '口诀' },
  { key: 'rules', label: '规则' },
  { key: 'quiz', label: '练习' },
  { key: 'review', label: '复习' },
] as const

type TabKey = (typeof TABS)[number]['key']

// 🔒 脚手架锁定文件：lane 不得修改。页面内容在各 pages/*.tsx 内实现。
export default function App() {
  const [tab, setTab] = useState<TabKey>('home')
  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === 'home' && <Home />}
        {tab === 'chant' && <Chant />}
        {tab === 'rules' && <Rules />}
        {tab === 'quiz' && <Quiz />}
        {tab === 'review' && <Review />}
      </main>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
