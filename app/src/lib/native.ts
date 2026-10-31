// 移动端（Capacitor）桥接层。浏览器环境下所有函数必须是安全的 no-op。
// 由 main.tsx 调用 initNative()；状态栏配色等原生行为由 laneM2 实现。

import { StatusBar, Style } from '@capacitor/status-bar'

/** 状态栏背景色（App 主题色） */
const STATUS_BAR_COLOR = '#ffb020'

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
  await setupStatusBar()
}
