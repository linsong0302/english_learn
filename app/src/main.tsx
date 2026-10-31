import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initNative, isNative } from './lib/native'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 移动端（Capacitor 原生壳）初始化：浏览器环境下为 no-op
initNative()

// PWA：生产环境且非原生壳内才注册离线缓存（开发环境不注册避免热更新被缓存干扰；
// App 内由原生直接托管本地资源，注册 SW 会导致升级后读到旧缓存）
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
