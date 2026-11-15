# 回望 ReWang

投资数据分析与决策复盘课程项目。**最终客户端是 Android 原生 App（Java + XML）**；后端通过 HTTP REST / JSON 对接，语言不限。

## 队友从这里开始
| 想知道什么 | 文档 |
|---|---|
| 我们做什么、目录和分工 | [项目说明](docs/PROJECT_GUIDE.md) |
| 每一页每一块是什么、怎么操作 | [前端逐模块说明](docs/FRONTEND_MODULES.md) |
| 后端要返回什么、字段和API | [数据与API指南](docs/DATA_API_GUIDE.md) |
| 先做什么、怎么联调验收 | [联调清单](docs/INTEGRATION_CHECKLIST.md) |
| Android如何打开、当前限制 | [Android交接](docs/ANDROID_HANDOFF.md) |

## 源码
- `android/`：原生客户端初始迁移、XML、Canvas图表、HTTP适配器及完整合成数据快照。
- `web/`：较完整的Web前端交互参考，不是最终Android成品。
- `docs/`：项目、页面、字段、接口与验收说明。

## 预览
[桌面Web参考](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/) · [手机布局交互预览](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/mobile)

手机布局预览在线可用，但当前GitHub代码基线尚未同步/mobile路由；它也不是Android实机效果。

## 当前状态
Android第一版未完成全部Web功能的原生迁移，尚无APK构建或模拟器验收证据，缺Gradle Wrapper。模型评估和AI响应均为模拟；真实鉴权、后端存储与计算、训练和大模型服务待对接。具体缺口见文档，不把演示状态视为生产完成。

## 快速开始
克隆后Android Studio打开`android/`而非仓库根目录，按[运行交接](docs/ANDROID_HANDOFF.md)补齐构建环境。Web在`web/`执行`npm install`、`npm run dev`。演示数据不需要真实账户或大模型key。
