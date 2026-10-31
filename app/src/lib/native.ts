// 移动端（Capacitor）桥接层。浏览器环境下所有函数必须是安全的 no-op。
// 由 main.tsx 调用 initNative()。
//
// 已实现：
// - isNative()：用 Capacitor 全局对象的 isNativePlatform() 判定是否运行在原生壳内
//   （浏览器直接打开时该全局不存在，已做空值与异常保护，安全返回 false）。
// - initNative()：
//   1) 状态栏配色：背景设为主题色 #ffb020，图标/文字用深色样式
//      （@capacitor/status-bar 的 Style.Light = 浅色背景配深色文字）；
//      全部 try/catch 包住，Web / iOS 上失败静默。
//   2) Android 返回键「再按一次退出」：监听 @capacitor/app 的 backButton 事件；
//      能后退时执行 window.history.back()；已在根页面时第一次按返回显示轻量提示条
//      「再按一次退出应用」（纯 DOM，2 秒自动消失并清理），2 秒内再次按返回则
//      App.exitApp()。initNative() 可能被 React StrictMode 重复调用，
//      listener 用模块级幂等标记保证全局只注册一次。
//
// 后续可扩展的官方插件（安装后在原生工程执行 npx cap sync 生效）：
// - @capacitor/splash-screen：控制启动屏（如 SplashScreen.hide()）
//   安装：npm install @capacitor/splash-screen
// - @capacitor/haptics：触感反馈（如 Haptics.impact({ style: ImpactStyle.Light })）
//   安装：npm install @capacitor/haptics
// - @capacitor/share：调用系统分享面板（如 Share.share({ title, text, url })）
//   安装：npm install @capacitor/share
// - @capacitor-community/keep-awake：学习时保持屏幕常亮（KeepAwake.keepAwake()）
//   安装：npm install @capacitor-community/keep-awake

import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

/** 状态栏背景色（App 主题色） */
const STATUS_BAR_COLOR = '#ffb020'
/** 「再按一次退出」的确认窗口时长（毫秒） */
const EXIT_CONFIRM_WINDOW_MS = 2000
/** 提示条显示时长（毫秒） */
const TOAST_DURATION_MS = 2000

/** backButton listener 是否已注册（模块级幂等标记，防 React StrictMode 重复注册） */
let backButtonRegistered = false
/** 上一次「已在根页面时按返回」的时间戳（毫秒），0 表示当前不在确认窗口内 */
let lastRootBackAt = 0
/** 提示条自动消失的定时器 */
let exitToastTimer: ReturnType<typeof setTimeout> | null = null

export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Capacitor 全局对象由原生运行时注入；浏览器直接打开时可能不存在
    const capacitor = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    return typeof capacitor?.isNativePlatform === 'function' && capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** 在页面底部显示轻量提示条（纯 DOM 追加 div，不依赖 React），2 秒后自动移除并清理定时器 */
function showExitToast(): void {
  if (typeof document === 'undefined') return
  // 已有提示条时先移除，避免重复叠加
  document.getElementById('native-exit-toast')?.remove()

  const toast = document.createElement('div')
  toast.id = 'native-exit-toast'
  toast.textContent = '再按一次退出应用'
  toast.style.cssText = [
    'position: fixed',
    'left: 50%',
    'bottom: 96px',
    'transform: translateX(-50%)',
    'z-index: 9999',
    'padding: 10px 20px',
    'border-radius: 999px',
    'background: rgba(0, 0, 0, 0.75)',
    'color: #ffffff',
    'font-size: 14px',
    'line-height: 1.4',
    'white-space: nowrap',
    'pointer-events: none',
  ].join(';')
  document.body.appendChild(toast)

  if (exitToastTimer !== null) clearTimeout(exitToastTimer)
  exitToastTimer = setTimeout(() => {
    toast.remove()
    exitToastTimer = null
  }, TOAST_DURATION_MS)
}

/**
 * 注册 Android 返回键处理（幂等：全局只注册一次）。
 * backButton 监听一旦注册会接管硬件返回键的默认行为，需手动调用 history.back()。
 * canGoBack 来自事件负载（@capacitor/app 8 无 App.canGoBack() 方法，以 .d.ts 为准）。
 */
async function registerBackButton(): Promise<void> {
  if (backButtonRegistered) return
  backButtonRegistered = true
  try {
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        lastRootBackAt = 0
        window.history.back()
        return
      }
      // 已在根页面：2 秒内第二次按返回才真正退出
      const now = Date.now()
      if (lastRootBackAt > 0 && now - lastRootBackAt <= EXIT_CONFIRM_WINDOW_MS) {
        lastRootBackAt = 0
        void App.exitApp().catch(() => {})
        return
      }
      lastRootBackAt = now
      showExitToast()
    })
  } catch {
    // 注册失败（如 Web 环境）静默，允许下次重试
    backButtonRegistered = false
  }
}

/** 原生环境下配置状态栏：主题色背景 + 深色图标（浅色背景配深色文字） */
async function setupStatusBar(): Promise<void> {
  try {
    await StatusBar.setBackgroundColor({ color: STATUS_BAR_COLOR })
    // Style.Light = 状态栏文字/图标用深色，适配浅色背景（见插件 .d.ts 注释）
    await StatusBar.setStyle({ style: Style.Light })
  } catch {
    // Web / iOS 上失败静默，不影响应用
  }
}

export async function initNative(): Promise<void> {
  if (!isNative()) return
  await Promise.all([setupStatusBar(), registerBackButton()])
}
