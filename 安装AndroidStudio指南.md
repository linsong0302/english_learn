# Android Studio 安装指南（零基础版）

> 本文只解决一件事：**把 Android Studio 装好，并把本项目需要的 Android SDK Platform 36 准备好**。
> 装完之后的打包步骤（出 APK）请看 [PACKAGING.md](PACKAGING.md)。
> 编写时间 2026-10，适用 Windows 10/11 64 位；本项目要求 compileSdk/targetSdk = 36。

---

## 一、下载链接

| 渠道 | 链接 | 说明 |
|---|---|---|
| **中国大陆推荐** | <https://developer.android.google.cn/studio> | Google 中国开发者站点，安装器从国内服务器下载，速度快 |
| 国际官网 | <https://developer.android.com/studio> | 部分网络环境访问慢或打不开 |

打开页面后点击绿色大按钮 **「Download Android Studio」**，同意条款，下载得到一个约 1GB 的 `.exe` 安装器（文件名类似 `android-studio-xxxx-windows.exe`）。

---

## 二、安装前自查（30 秒）

- Windows 10 / 11 **64 位**
- 内存 8GB 起（16GB 更流畅）
- 空闲磁盘 **≥ 10GB**（Studio 本体约 3-4GB + SDK 组件若干 GB）
- **不需要装 JDK**：Android Studio 自带内置 JDK，直接能用；你电脑上已有的 JDK 21 也不会冲突

---

## 三、安装步骤（操作 5 分钟，下载等待 10-30 分钟）

1. **双击安装器**，弹出用户账户控制时点「是」。
2. **Welcome** → `Next`。
3. **Choose Components**：保持默认即可。（其中 Android Virtual Device 是安卓模拟器，本项目用不到，取消勾选可以省几个 GB；留着也无妨。）
4. **Installation Location**：默认 `C:\Program Files\Android\Android Studio`。想装其他盘就改路径（**路径不要包含中文或空格**）→ `Next` → `Install` → 等进度条 → `Next` → `Finish`（保持勾选 Start Android Studio）。
5. **首次启动向导**：
   - Import Settings → 选 **Do not import settings** → OK；
   - 数据共享弹窗随意（Send / Don't send 都行）；
   - Setup Wizard 的安装类型选 **Standard** → `Next` → License Agreement 里把左侧每一条都点一遍、右侧选 **Accept**，全部接受后点 `Finish`；
   - 然后它自动下载 SDK 组件，耐心等进度条走完（这一步最容易慢，见第六节 Q1）→ `Finish`。

---

## 四、确认 SDK Platform 36（本项目的硬性要求）

首次向导默认装的是「当时最新版」SDK；本项目 `compileSdk/targetSdk = 36`，要确认 36 这一套已装上：

1. 打开 SDK 管理器，两种入口任选：
   - 没打开项目时（欢迎界面）：右上角 **More Actions → SDK Manager**；
   - 已打开项目：**File → Settings → Languages & Frameworks → Android SDK**。
2. 在列表里勾选 **Android SDK Platform 36**（Android 16.0 "Baklava"）→ `Apply` → 同意协议 → 等下载完成 → `Finish` / `OK`。若它前面已经是 ✓（Installed）就不用动。
3. 顺便记下页面顶部的 **Android SDK Location**（默认 `C:\Users\你的用户名\AppData\Local\Android\Sdk`）——以后排查 SDK 报错时要用。

> 用手机真机调试的话（可选）：再用数据线连接手机、开启「开发者选项 → USB 调试」即可，SDK 管理器里勾上 **Android SDK Platform-Tools**（通常默认已装）。

---

## 五、装完之后：怎么打开本项目打包

```bash
# 在项目根目录执行（Git Bash / cmd / PowerShell 均可）
cd app
npm install          # 第一次需要
npm run cap:sync     # 构建网页 + 同步进 Android 工程
npm run cap:open     # 自动用刚装好的 Android Studio 打开本项目
```

Android Studio 打开后：菜单 **Build → Build App Bundle(s) / APK(s) → Build APK(s)**，完成后点右下角弹窗的 **locate** 就能找到 `app-debug.apk`。

更详细的出包流程（debug / release 签名 / 图标）都在 [PACKAGING.md](PACKAGING.md)。

---

## 六、常见问题

**Q1：下载 SDK 组件很慢 / 一直转圈？**
用第一节的中国站链接安装；SDK 下载慢可以在 **Settings → Appearance & Behavior → System Settings → HTTP Proxy** 里配置网络代理（Auto-detect 或手动填你的代理地址），配置后重试。

**Q2：向导下载组件失败、报 SDK 路径无权限？**
右键安装器和 Android Studio 都「以管理员身份运行」；SDK Location 不要放在系统保护目录（如 `C:\Program Files` 下），保持默认的用户目录即可。

**Q3：C 盘空间不够？**
两处都可以换盘：① 安装 Studio 时改 Installation Location；② SDK 管理器左上角点 **Edit** 改 Android SDK Location（例如 `D:\Android\Sdk`）。改完记得路径不含中文和空格。

**Q4：怎么确认装好了？**
满足两点即可：① Android Studio 能打开到欢迎界面；② SDK 管理器里 **Android SDK Platform 36** 显示 Installed。然后直接按第五节走流程，`cap:open` 打开项目后 Studio 会自动补齐其余缺失组件（弹协议就 Accept）。

**Q5：装 Studio 时要不要动我已有的 JDK 21？**
不用。Studio 打包用的是它内置的 JDK，互不干扰。只有当你想脱离 Studio、纯命令行跑 `gradlew.bat` 且遇到 JDK 兼容报错时，再按 PACKAGING.md 的说明装 JDK 17 并设置 `JAVA_HOME`。
