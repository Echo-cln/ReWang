> **2026-11-15 增量说明：**已补充真实行情 API、新闻/公告回退、原生市场模拟流程、Gradle Wrapper和调试包构建。下文部分旧状态仅描述早期版本；以 [真实市场与Android交付](REAL_MARKET_AND_ANDROID.md) 为当前依据。

# 回望：项目说明与阅读入口

> 面向第一次接触项目的队友。最终用户客户端是 Android 原生 App（Java + XML）。Web 是界面和交互参考，不是最终 Android 成品。
> 本说明核对基线：GitHub `8a16c57`；此文档提交不改变业务代码。

## 1. 我们在做什么
回望是投资数据分析与决策复盘平台。用户导入历史报价，记录资金和交易，查看收益与风险，比较实际行动和固定规则，再记录当时的理由与事后反馈。模型实验与 AI 助手用于辅助研究，不能把模拟结果当作已训练模型或真实投资建议。

典型流程：进入账户 → 导入报价 → 入金 → 记录买卖 → 查看组合估值 → 分析收益与风险 → 与固定规则比较 → 记录/补充决策复盘。
独立研究流程：选择标的与区间 → 查看分析 → 配置模型实验 → 检查数据划分和评估 → 用 AI 解读已经存在的指标。

## 2. 三种界面不要混淆
| 对象 | 作用 | 当前状态 |
|---|---|---|
| `web/` | React/TypeScript Web 界面、编辑器和演示数据适配器 | GitHub 有源码；默认用内存数据，不请求真实后端 |
| 线上 `/mobile` | 供讨论 Android 排版的手机比例浏览器预览 | 在线有，但当前 GitHub 基线还没有同步该路由；不能当作 APK |
| `android/` | Java + XML 原生客户端 | 初始迁移；有原生页面、Canvas 图表及 HTTP 读取；不等于 Web 功能全部完成 |

线上参考：[桌面站点](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/) · [手机交互预览](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/mobile)。线上发布与 GitHub 不是自动同步，修改日期和提交应分别核对。

## 3. 推荐阅读顺序
1. 本文：理解定位、目录及分工。
2. [逐页逐模块说明](FRONTEND_MODULES.md)：对照页面，知道每块是什么。
3. [数据与 API 对接](DATA_API_GUIDE.md)：后端先读这里，不需要先学习 React。
4. [联调与验收](INTEGRATION_CHECKLIST.md)：明确开发顺序与可复现的验收操作。
5. [Android 运行交接](ANDROID_HANDOFF.md)：当前构建与迁移限制。

## 4. 目录地图
| 路径 | 责任 |
|---|---|
| `android/app/src/main/java/com/rewang/app/MainActivity.java` | 原生导航、各页渲染与交互，当前集中在一个 Activity |
| `android/app/src/main/java/com/rewang/app/ResearchChart.java` | Canvas 绘制标准化走势/回撤 |
| `android/app/src/main/java/com/rewang/app/ApiClient.java` | HTTP 线程、超时、Bearer Header、主线程回调 |
| `android/app/src/main/res/layout/activity_main.xml` | 原生根布局、导航、内容容器 |
| `android/app/src/main/assets/workspace-demo.json` | 可直接返回给客户端的完整数据快照 |
| `web/app/workspace.tsx` | Web 页面导航、筛选状态、编辑弹窗、数据读取/修改入口 |
| `web/lib/frontend-demo.ts` | 前端模拟仓库；读数据 `demoView`，修改 `demoMutate` |
| `web/lib/analysis.ts` | 报价指标、账本重放、固定规则路径等参考计算 |
| `web/lib/research.ts` | 跨标的收益、回撤和相关性计算参考 |
| `web/lib/demo.ts` | 生成资金、交易、笔记的案例 |
| `web/app/research-panel.tsx`、`analysis-extra.tsx` | 分析展示与图表 |
| `web/app/model-lab.tsx` | 模型实验模拟状态与评估展示 |
| `web/app/assistant-panel.tsx` | AI 对话模拟流式输出 |
| `web/app/api/workspace/route.ts` | 早期 Web 后端参考。不是已完成的 Android API 服务 |

## 5. 当前交付边界
- Web：默认合成案例，支持页面内存里的增改删和 CSV 导入；刷新恢复初始案例。登录页仅演示。
- Android：默认加载 JSON；真实模式可以通过设置请求 HTTPS 后端，但后端还要实现 Bearer 鉴权和一致响应。
- 模型：固定评估样例，无真实训练。AI：模板响应，无真实 DeepSeek 请求。
- Android 仍缺：完整 CRUD 编辑器、文件导入、日期筛选、部分图表、登录续期、任务轮询与 SSE、状态缓存等。
- 未完成 Android APK 构建/模拟器验收；缺少 Gradle Wrapper，详见运行交接。不能把 Web 的测试结果写成 Android 的测试结果。

## 6. 按工作包分工
| 工作包 | 输入 | 输出/验收 |
|---|---|---|
| Android 客户端 | 已确认的手机预览、JSON 契约 | 原生布局、导航、编辑表单、API 状态处理、APK |
| 后端与数据 | 快照字段、动作请求、数据约束 | 登录鉴权、存储、查询、账本校验、计算接口 |
| 分析/模型服务 | 报价、特征定义、时间划分 | 可复算指标、真实实验结果与版本信息 |
| 大模型服务 | 已授权研究上下文、服务商配置 | 后端代理、SSE、错误与取消；密钥不进入 App |

三个人可合并工作包，但必须给每个包指定一个负责人。先冻结一版字段和错误结构，再并行开发；不要求前后端语言相同。
