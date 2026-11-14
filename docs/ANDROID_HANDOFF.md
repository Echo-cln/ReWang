# Android 原生交接

## 技术与运行
Java 17 源码 + XML；compile/target SDK 35，min SDK 26；Android Gradle Plugin 8.7.3，Gradle 8.9，JDK 17。
在 Android Studio 打开 `android/`（不是仓库根目录），安装 SDK 35 并同步 Gradle。
本仓库尚未包含 Gradle Wrapper 二进制；如 IDE 要求 wrapper，请先安装 Gradle 8.9，在 android 目录运行 `gradle wrapper --gradle-version 8.9`，将产生的 wrapper 一并提交。随后执行 `./gradlew assembleDebug`（Windows 用 gradlew.bat）。
当前工作环境没有 Android SDK/Gradle，未编译 APK、未运行模拟器。依赖下载与 API 兼容性需在 Android Studio 验证。

## 后端连接
ApiClient.java：HttpURLConnection + ExecutorService，结果切回 UI 主线程；请求超时和 HTTP 错误均显示。真实连接仅接受 HTTPS。
MainActivity → 连接设置：输入后端 URL 与用户 Access Token，GET /api/workspace。
Authorization: Bearer <用户 token>。大模型 API key 不得写入 Android。
响应必须为 workspace-demo.json 同结构：instruments、prices、research(series/correlation)、ledger、flows、trades、notes、comparison、asOf。
金额整数分；日期 YYYY-MM-DD；指标百分数值（5 表示 5%）；模型概率 0—1。
后端开发者可直接以 assets/workspace-demo.json 作为 mock 响应；无需理解 React 才能开发接口。

建议后续端点：POST /auth/login、POST /auth/refresh；POST /api/workspace（资金、交易、笔记动作见 web/docs/FRONTEND_HANDOFF.md）；POST /api/experiments、GET /api/experiments/:id；POST /api/research/chat。
现有 Web 服务的 ChatGPT 登录不是 Android Bearer 登录，不能直接当成已对接。队友需实现用户登录与 token 验证后才能开启真实模式。

## 已实现的 Android 原生界面
首页、分析中心、市场标的选择及报价、投资组合、规则对照、交易账本只读、笔记演示新增、模型配置与模拟评估、AI 模拟问答、数据来源、后端连接设置。
原生 Canvas 展示标准化价格与回撤；演示快照默认填充 3 标的、180 报价、7 交易、3 资金流水、3 笔记。不是 WebView 套壳。

## 还未完成的 Android 功能（交付边界）
1. 账本增改删、笔记编辑删除、CSV 文件选择与预览。
2. 日期筛选、月度热力表、风险散点图、完整预测明细、结果导出。
3. 登录/注册/续期 UI 与真实鉴权。
4. 模型异步任务轮询、AI SSE 流式输出与取消。
5. Activity 状态恢复、离线缓存、多账户选择、无障碍和不同屏幕验收。
6. APK 构建、真机/模拟器测试。

上述 Web 参考交互已经存在，但不代表 Android 已全部实现。队友可先按 JSON 和端点并行开发后端；客户端迁移继续在 android/ 中推进。
