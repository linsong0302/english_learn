// 移动端（Capacitor）桥接层。浏览器环境下所有函数必须是安全的 no-op。
// 由 main.tsx 调用 initNative()；状态栏配色、返回键等原生行为由 laneM2 实现。

export function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
}

export async function initNative(): Promise<void> {}
