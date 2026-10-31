# Lane M3 — 打包文档 PACKAGING.md（手机 App 分支 mobile-app）

> 拥有：仓库根目录 `PACKAGING.md`（**仅此一个文件**）。
> 🔒 禁改：其他一切文件（含 app/README.md、tasks/、.ralph/ 等）。
> 若 `.ralph/STOP` 存在：什么都不做直接退出。

- [~] 撰写仓库根目录 `PACKAGING.md`（全中文、面向零基础新手，步骤可复制执行）。必须覆盖以下事实（先去仓库核实，以仓库实际为准）：
  - 方案总览：本仓库用 **Capacitor 8** 把现有 Vite+React18+TS Web 应用打成手机 App；一套代码同时支持 Android 原生 App 与 PWA 直装
  - 一次性准备：Node 20+、JDK 17、Android Studio（含 SDK，版本对应 `app/android/variables.gradle` 里的 compileSdk/targetSdk，写文档前去读这个文件确认）；首次拉取仓库后的命令：`cd app && npm install && npm run cap:sync`（android 下的 web 资源拷贝已 gitignore，必须 sync 一次）
  - 打 debug 包两条路：① Android Studio 打开 `app/android` → Build → Build App Bundle(s)/APK(s)；② 纯命令行 `cd app/android && ./gradlew.bat assembleDebug`（Windows；产物路径 `android/app/build/outputs/apk/debug/app-debug.apk`）
  - release 签名与出正式包：keytool 生成 keystore 的完整命令、`android/app/build.gradle` 里 signingConfigs/release 配置示例、`assembleRelease` 产物路径、以及 Android Studio 图形化 Generate Signed APK 的替代路径
  - 图标与启动图：准备 1024x1024 `icon.png` 放 `app/assets/` 后执行 `npx @capacitor/assets generate --android`（需临时装 @capacitor/assets，写成一条完整命令）
  - 改了网页内容后重新打包：`cd app && npm run cap:sync` 再走打包；改应用显示名（`capacitor.config.ts` 的 appName + `android/app/src/main/res/values/strings.xml`）、改版本号（`android/app/build.gradle` 的 versionCode/versionName）
  - iOS 提示：需要一台 Mac（Xcode + `npx cap add ios`），Windows 上无法出 iOS 包，给出官方文档链接
  - PWA 方式：`npm run build` 把 `dist/` 部署到任意静态托管（或 GitHub Pages），手机浏览器打开即可「添加到主屏幕」当 App 用；项目已有 manifest.webmanifest / 离线 sw.js / 图标
  - 常见问题：gradle 首次下载慢（提示可配国内镜像，给阿里云 maven 镜像示例片段）、`local.properties` 不入库由 Android Studio 自动生成、签名文件切勿提交到 git
- [ ] 自查：逐条核对文档中的脚本名（cap:sync/cap:open/cap:run）、路径（app/android/…）、配置值（appId=com.yinbiao.study、appName=KK音标学习、webDir=dist）与仓库一致；核对 `app/android/variables.gradle`、`app/android/app/build.gradle` 里的 SDK/Gradle/Java 版本并让文档与之匹配；发现出入以仓库为准修正文档
