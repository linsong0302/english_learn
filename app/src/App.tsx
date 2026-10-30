import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Chant from './pages/Chant'
import Rules from './pages/Rules'
import Quiz from './pages/Quiz'
import Review from './pages/Review'
import Sounds from './pages/Sounds'
import Echo from './pages/Echo'
import Plan from './pages/Plan'

const TABS = [
  { key: 'home', label: '首页' },
  { key: 'chant', label: '口诀' },
  { key: 'rules', label: '规则' },
  { key: 'quiz', label: '练习' },
  { key: 'review', label: '复习' },
] as const

type TabKey = (typeof TABS)[number]['key']
type ExtraKey = 'sounds' | 'echo' | 'plan' | null

// 🔒 脚手架锁定文件：页面内容在各 pages/*.tsx 内实现。
// 二级页面机制：任意页面通过 window.dispatchEvent(new CustomEvent('kk:open-extra', { detail: 'sounds' | 'echo' | 'plan' }))
// 打开全屏二级页；二级页组件接收 { onClose } 并自行渲染返回按钮。
export default function App() {
  const [tab, setTab] = useState<TabKey>('home')
  const [extra, setExtra] = useState<ExtraKey>(null)

  useEffect(() => {
    const open = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === 'sounds' || detail === 'echo' || detail === 'plan') setExtra(detail)
    }
    window.addEventListener('kk:open-extra', open)
    return () => window.removeEventListener('kk:open-extra', open)
  }, [])

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
      {extra === 'sounds' && <Sounds onClose={() => setExtra(null)} />}
      {extra === 'echo' && <Echo onClose={() => setExtra(null)} />}
      {extra === 'plan' && <Plan onClose={() => setExtra(null)} />}
    </div>
  )
}
