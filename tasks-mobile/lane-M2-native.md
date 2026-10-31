# Lane M2 — 原生桥接层（Capacitor，手机 App 分支 mobile-app）

> 拥有：`app/src/lib/native.ts`（**仅此一个文件**）。
> 🔒 禁改：其他一切文件（main.tsx 已预先 `import { initNative, isNative } from './lib/native'` 并调用 `initNative()`，你不需要也不允许动它）。
> 依赖已安装好：`@capacitor/core`、`@capacitor/app`、`@capacitor/status-bar`（Capacitor 8）。不要再安装新依赖，确有需要就在任务下追加一行备注。
> 硬性要求：浏览器环境下全部行为必须是安全 no-op（不能报错、不能弹任何东西）；TypeScript 严格模式。
> 若 `.ralph/STOP` 存在：什么都不做直接退出。

- [x] 状态栏与原生环境判定：完善 `isNative()`（用 Capacitor 全局对象的 `isNativePlatform()`，注意浏览器直开时该全局不存在）；`initNative()` 在原生环境下用 `@capacitor/status-bar` 把状态栏背景设为主题色 `#ffb020`、图标用深色样式（浅色背景配深色图标，具体 API 以插件 `.d.ts` 为准），并用 try/catch 包住，iOS/Web 上失败静默
- [x] Android 返回键「再按一次退出」：用 `@capacitor/app` 的 `backButton` 事件实现——能后退（`App.canGoBack()`）时执行 `window.history.back()`；已在根页面时，第一次按返回弹出一个轻量提示条「再按一次退出应用」（纯 DOM 追加 div，2 秒自动消失并清理，不依赖 React），2 秒内再次按返回则 `App.exitApp()`。注意 `initNative()` 可能被 React StrictMode 重复调用，listener 必须全局只注册一次（模块级幂等标记）。函数导出签名保持 `initNative(): Promise<void>`、`isNative(): boolean` 不变；文件头中文注释说明：哪些已实现、后续可扩展的官方插件（Splash Screen / Haptics / Share / Keep Awake）及安装命令示例
