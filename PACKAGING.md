# KK 音标学习 · 手机打包指南（PACKAGING.md）

> 这份文档写给**零基础新手**：照着复制、粘贴、回车，就能把这个网页变成手机 App。
> 所有命令默认在项目根目录（`2_音标学习/`）下执行；标了 `Windows` 的命令在 cmd 或 PowerShell 里运行。
> 文中的版本号、路径、脚本名都与本仓库实际文件核对过（2026-10 核实）。

---

## 一、方案总览

本仓库用 **Capacitor 8** 把现有的 Vite + React 18 + TypeScript Web 应用**原样打包成手机 App**：

- **一套代码，两种安装方式**：
  1. **Android 原生 App**（.apk / .aab）：用 Capacitor 包一层原生壳，可以装到任何安卓手机上；
  2. **PWA 直装**：`dist/` 部署到任意静态网站，手机浏览器打开后「添加到主屏幕」，看起来和原生 App 一样，还支持离线。
- 源码不复制：Capacitor 只是把构建出来的 `dist/` 拷进 Android 工程的 assets 里，网页逻辑还是那一份。

**关键事实速查（与仓库一致，改之前先看这里）**：

| 项目 | 值 | 在哪个文件里 |
|---|---|---|
| Capacitor 版本 | 8（`@capacitor/core@^8.6.0`） | `app/package.json` |
| appId（包名） | `com.yinbiao.study` | `app/capacitor.config.ts` |
| appName（应用名） | `KK音标学习` | `app/capacitor.config.ts` |
| webDir（网页产物目录） | `dist` | `app/capacitor.config.ts` |
| minSdk | 24（Android 7.0+） | `app/android/variables.gradle` |
| compileSdk / targetSdk | **36**（Android 16） | `app/android/variables.gradle` |
| Android Gradle Plugin | 8.13.0 | `app/android/build.gradle` |
| Gradle Wrapper | 8.14.3 | `app/android/gradle/wrapper/gradle-wrapper.properties` |
| versionCode / versionName | `1` / `"1.0"` | `app/android/app/build.gradle` |
| 安卓显示名 | `KK音标学习` | `app/android/app/src/main/res/values/strings.xml` |

---

## 二、一次性准备（只做一遍）

1. **Node.js 20 或更新版本**：去 <https://nodejs.org> 下载安装。验证：终端输入 `node -v` 应显示 v20 以上。
2. **JDK 17**：Android Gradle Plugin 8.13 要求 JDK 17（不要装 21，也不要装 8）。推荐用 Android Studio 自带的 JDK 17，或从 <https://adoptium.net> 下载 Temurin 17。验证：`java -version` 显示 17.x。
   - 若你安装了独立的 JDK 17，记得设置环境变量 `JAVA_HOME` 指向它的安装目录。
3. **Android Studio**（自带 Android SDK）：去 <https://developer.android.com/studio> 下载安装。
   - 安装后在 `Settings → Languages & Frameworks → Android SDK` 里确认已安装 **Android SDK Platform 36**（本仓库 compileSdk/targetSdk = 36）。没装的话勾上它，点 Apply 让 Studio 自动下载。
   - 首次用命令行或 Studio 打开工程时，Studio 会自动补齐缺失的 SDK 组件，一路同意即可。

---

## 三、首次拉取仓库后（每个新电脑都做一遍）

Android 工程里的「网页拷贝产物」（`android/app/src/main/assets/public/` 等）**已被 gitignore，不会随仓库下载**，所以拉完代码必须 sync 一次：

```bash
cd app
npm install
npm run cap:sync
```

说明：`cap:sync` 这个脚本实际执行的是 `npm run build && cap sync android`——也就是先把网页构建到 `dist/`，再把 `dist/` 拷进 Android 工程。所以这一步跑完，Android 工程就是「随时可以打包」的状态。

---

## 四、打 debug 测试包（两条路，选一条）

debug 包不签名也能装，适合自己试玩、发给孩子用。

### 路 ①：Android Studio 图形界面

1. 在 `app/` 目录下执行 `npm run cap:open`（等价于用 Android Studio 打开 `app/android` 目录；也可以手动 File → Open 选择 `app/android`）。
2. 菜单 **Build → Build App Bundle(s) / APK(s) → Build APK(s)**。
3. 构建完成后右下角弹窗点 **locate**，APK 在：
   `app/android/app/build/outputs/apk/debug/app-debug.apk`

### 路 ②：纯命令行

```bash
cd app/android
gradlew.bat assembleDebug
```

（Windows 的 cmd / PowerShell 用 `gradlew.bat assembleDebug`；在 Git Bash 里则写 `./gradlew.bat assembleDebug`。产物路径同上。）

**装到手机上**：把 `app-debug.apk` 传到手机点开安装（提示「未知来源」时允许即可）；或手机连电脑开 USB 调试后：

```bash
adb install -r app/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 五、release 正式包：签名与出包

发布给别人长期用的版本建议用 release 包（体积更小、性能更好）。release 需要**签名**，签名文件（keystore）一个项目最好**终身只用一个**。

### 第 1 步：生成签名文件（只做一次）

在项目根目录开终端（keytool 随 JDK 17 一起安装）：

```bash
keytool -genkeypair -v -keystore kk-yinbiao.keystore -alias kk-yinbiao -keyalg RSA -keysize 2048 -validity 10000
```

- 按提示设置 keystore 密码、key 密码（两者可以相同），并如实填写姓名/组织等信息。
- 会在当前目录生成 `kk-yinbiao.keystore`，有效期 10000 天。

### 第 2 步：把签名配置写进 `app/android/app/build.gradle`

把现有的 `buildTypes` 部分改成下面这样（新增 `signingConfigs`，并在 `release` 里引用；其余内容别动）：

```gradle
signingConfigs {
    release {
        // 把 kk-yinbiao.keystore 放到 app/android/app/ 目录下（与本 build.gradle 同级）
        storeFile file('kk-yinbiao.keystore')
        storePassword '你的keystore密码'
        keyAlias 'kk-yinbiao'
        keyPassword '你的key密码'
    }
}

buildTypes {
    release {
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        signingConfig signingConfigs.release
    }
}
```

### 第 3 步：出正式包

命令行方式：

```bash
cd app/android
gradlew.bat assembleRelease   # 出 APK，产物：app/android/app/build/outputs/apk/release/app-release.apk
gradlew.bat bundleRelease     # 出 AAB（上架 Google Play 用），产物：app/android/app/build/outputs/bundle/release/app-release.aab
```

（没配签名时 `assembleRelease` 的产物叫 `app-release-unsigned.apk`，装不了；配好后会变成 `app-release.apk`。）

**替代路**：也可以在 Android Studio 里走图形界面——**Build → Generate Signed App Bundle / APK**，按向导选择你的 keystore、填密码、选 release，向导会直接告诉你产物位置，效果等价且不用改 `build.gradle`。

> ⚠️ **签名文件切勿提交到 git！** keystore 丢了就永远无法给同一个 App 发更新（只能换包名重新上架）。建议：把 `*.keystore` / `*.jks` 加进 `app/android/.gitignore`（目前该项是注释状态），或干脆把 keystore 放在仓库目录之外备份好。密码同样不要写进任何提交。

---

## 六、图标与启动图

1. 准备一张 **1024×1024 的 `icon.png`**（建议同时准备 2732×2732 的 `splash.png` 启动图，没有也能生成），放到 `app/assets/` 目录（这个目录目前不存在，新建即可）：

   ```
   app/assets/icon.png      # 1024x1024
   app/assets/splash.png    # 2732x2732（可选）
   ```

2. 执行下面这一条命令（`@capacitor/assets` 不在仓库依赖里，这里临时装一下再生成；装到 devDependencies 不影响构建）：

   ```bash
   cd app && npm install --save-dev @capacitor/assets && npx @capacitor/assets generate --android
   ```

3. 生成完毕后同步并重新打包：

   ```bash
   npm run cap:sync
   ```

   然后按第四节或第五节重新打一次包即可看到新图标/启动图。

---

## 七、改了网页内容后，怎么重新打包？

**网页有任何改动（改了 `src/`、`data/` 里的内容），都要先 sync 再打包**：

```bash
cd app
npm run cap:sync
```

然后按第四节（debug）或第五节（release）重新打包。就这么简单——`cap:sync` = 重新构建网页 + 重新拷贝进 Android 工程。

**改应用的显示名**（手机桌面上图标下面的字）：

1. 改 `app/capacitor.config.ts` 里的 `appName: 'KK音标学习'`；
2. 同步改 `app/android/app/src/main/res/values/strings.xml` 里的 `app_name` 和 `title_activity_main`（这两行也要改）；
3. `npm run cap:sync` 后重新打包。

**改版本号**：编辑 `app/android/app/build.gradle` 里的两行——

```gradle
versionCode 1        // 每次发新版 +1（必须递增）
versionName "1.0"    // 展示给用户看的版本号，如 "1.1"
```

改完 `npm run cap:sync`（保险起见）再打包。

---

## 八、iOS 提示（Windows 用户请跳过）

- 打 iOS 包**必须要一台 Mac**（需要 Xcode）。在 Mac 上执行 `npx cap add ios` 生成 iOS 工程，再用 Xcode 签名出包。
- **Windows 上无法出 iOS 包**，本仓库目前也只包含 Android 工程。
- 官方文档：<https://capacitorjs.com/docs/ios>

---

## 九、不想装 Android Studio？走 PWA 直装

如果只是想让孩子手机上能用，**PWA 是零门槛方案**，不需要 JDK、不需要 Android Studio：

1. 构建网页：

   ```bash
   cd app
   npm run build
   ```

2. 把生成的 `app/dist/` 整个目录部署到任意**静态托管**（Nginx、Vercel、Netlify、GitHub Pages 都行）。注意 `index.html` 里引用的是绝对路径（`/manifest.webmanifest`、`/sw.js`、`/icon.svg`），所以请部署在**域名根路径**；GitHub Pages 的子路径部署需要调整 vite 的 base 配置（`vite.config.ts` 属于锁定文件，需项目维护者处理）。
3. 手机浏览器打开网址 → 菜单里选「**添加到主屏幕**」→ 桌面上就多了一个「KK音标」图标，全屏打开，用起来和 App 一样。

这个项目已经具备完整 PWA 能力：`manifest.webmanifest`（应用名、主题色 `#ffb020`、图标 192/512）、离线缓存 `sw.js`（生产环境且非 App 内壳时自动注册）、图标 `icon.svg / icon-192.png / icon-512.png`。

---

## 十、常见问题（FAQ）

**Q1：`gradlew.bat assembleDebug` 卡在下载东西，很慢？**
Gradle 首次运行要下载 8.14.3 发行包和一堆依赖库，国内网络常慢。可以给 `app/android/build.gradle` 配**阿里云 Maven 镜像**加速：在 `buildscript { repositories { … } }` 和 `allprojects { repositories { … } }` 的最前面各加两行：

```gradle
maven { url 'https://maven.aliyun.com/repository/google' }
maven { url 'https://maven.aliyun.com/repository/public' }
```

加完删掉 `android/.gradle` 缓存目录再重试。

**Q2：`android/local.properties` 报错 / 找不到 SDK？**
这个文件**不入库**（已被 gitignore），它记录你本机的 SDK 路径（`sdk.dir=...`），由 Android Studio 首次打开 `app/android` 时自动生成。报 SDK 相关错误时，用 Studio 打开一次工程、或手动新建该文件写上你本机的 `sdk.dir` 即可。**不要把它提交到 git**。

**Q3：签名文件可以提交到 git 吗？**
**绝对不要。** 见第五节的警告：keystore 泄露 = 别人可以冒充你发 App；keystore 丢失 = 无法给老用户发更新。

**Q4：`npm run build` 报 `ENOTEMPTY` / `EPERM`（dist 相关）？**
多半是并发写 dist 或文件被占用，等 5 秒重试一次；还不行就删掉 `app/dist` 再 build。

**Q5：`npm run cap:sync` 报找不到 android 工程？**
确认你在 `app/` 目录下执行，且仓库完整（`app/android/` 目录存在）。这个仓库的 android 工程已随 git 提交，缺了就检查是否漏拉分支 `mobile-app`。

---

## 附：本仓库与打包相关的 npm scripts（`app/package.json`）

| 脚本 | 实际执行 | 用途 |
|---|---|---|
| `npm run build` | `tsc && vite build` | 构建 Web 产物到 `dist/` |
| `npm run cap:sync` | `npm run build && cap sync android` | 构建并同步进 Android 工程（改动网页后必跑） |
| `npm run cap:open` | `cap open android` | 用 Android Studio 打开 Android 工程 |
| `npm run cap:run` | `cap run android` | 构建并直接跑在连接的安卓设备/模拟器上 |
| `npm run dev` | `vite` | 本地网页开发服务器 |

有疑问先对照第一节「关键事实速查」里的文件路径去仓库核实——**以仓库实际为准**。
