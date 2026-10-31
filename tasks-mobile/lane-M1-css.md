# Lane M1 — 移动端 CSS 适配（手机 App 分支 mobile-app）

> 拥有：`app/public/mobile.css`（**仅此一个文件**）。
> 🔒 禁改：其他一切文件（index.html / main.tsx / App.tsx / styles.css / pages / package.json 等）。
> 背景：`index.html` 已在 body 末尾用 `<link rel="stylesheet" href="/mobile.css" />` 引入本文件，加载晚于应用打包样式，普通选择器即可覆盖；已提供 `capacitor.config.ts` 原生壳。应用本身是 max-width 480px 居中的卡片式布局，主题色 #ffb020。
> 若 `.ralph/STOP` 存在：什么都不做直接退出。

- [x] 安全区与滚动行为：`env(safe-area-inset-*)` 处理刘海屏/手势条（给 body 内容区加内边距，顶部状态栏区域与底部手势区不被内容遮挡）；`overscroll-behavior: none` 禁掉整页橡皮筋与下拉刷新；`position: fixed` 的底部 Tab 栏要额外考虑底部安全区（如现无 fixed 元素则留注释说明即可）
- [x] 触控体验：全局 `-webkit-tap-highlight-color: transparent`；按钮/可点元素 `user-select: none`（正文文本保持可选）；`touch-action: manipulation` 消除双击缩放延迟；图片 `-webkit-user-drag: none`；完成后在文件头部注释里用中文写一段「本文件做了什么/为什么」，方便后人维护
