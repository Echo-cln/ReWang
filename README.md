# 回望 ReWang

最终交付客户端：**Android 原生 App（Java + XML）**。后端语言由团队选择，通过 HTTP REST / JSON 连接，不要求与客户端一致。

## 当前目录
- `android/`：原生 Android 初始客户端，Java Activity、XML 布局、Canvas 图表、HTTP API 适配器、完整合成数据快照。
- `web/`：已确认的 Web 前端参考及完整交互演示，用于 Android 后续界面迁移；不是最终 Android 成品。
- `docs/ANDROID_HANDOFF.md`：运行、后端协议、已完成与待迁移清单。

**Android 当前是第一版迁移，尚未完成 Web 全部功能的原生移植，也未经 APK 构建及模拟器验收。** 不要将 Web 已通过的测试当作 Android 构建通过。
