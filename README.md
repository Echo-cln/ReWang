# 回望 ReWang

投资数据分析、历史决策模拟与复盘。最终客户端为 **Android 原生 Java + XML**；Web 提供交互参考和公开只读市场 API。

## 手机端为主入口（2026-11-17更新）

[统一手机交互入口](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/mobile) · [360/390/430px响应式预览](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/mobile/device)

默认首页为行情，主导航：行情 / 分析 / 模拟 / 研究 / 我的。全部页面可从右上角功能目录找到。

- 44支真实名称股票，报价、指数和排名为合成演示；搜索、行业、排行、自选、详情日K。
- A股最多3股，20/60日报价区间真实计算收益、波动、回撤和相关性。
- 32股历史模拟；载入完整演示账户可看到2支持仓、3笔成交、理由及买入持有规则对照。
- 手机模型实验分步配置/评估，加载、取消、失败/重试及JSON导出；AI为本地模板。

**以上是移动端Web交互参考，不能冒充原生Android完成。** Android当前仍有界面和功能差距，真实登录/持久后端/模型/LLM尚待集成。后端可按下列接口契约并行开发。

[完整手机端说明、按钮到API映射、实现状态](docs/MOBILE_FRONTEND_HANDOFF.md)

## 其他入口

[真实市场与手机模拟](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/market) · [桌面研究参考](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/) · [分析中心手机预览](https://rewang-investment-lab.tender-ibis-1699.chatgpt.site/mobile)

市场 → 新闻/公告 → 选择历史起点 → 模拟买卖 → 推进交易日 → 持仓与决策复盘。

## 本轮交付

- 真实公开行情：六家美股、日线、最近报价、时间和来源、收益/波动/回撤。
- 新闻 RSS；SEC监管披露受限时，切换公司官网发布或带采集时间的真实 SEC 快照。
- 前台60秒轮询、缓存、失败状态；不是交易所逐笔实时订阅。
- 浏览器及原生 Android 模拟账户、交易验证、费用/盈亏、本地保存与导出。
- Android Gradle Wrapper、原生底部导航、Canvas图表与API客户端。

[本轮详细交接、API及限制](docs/REAL_MARKET_AND_ANDROID.md) · [自查记录](docs/QA_2026-11-15.md)

## Android 运行

Android Studio 打开 **`android/`**。使用完整 JDK17、SDK35。Windows命令：

```powershell
cd ReWang\android
.\gradlew.bat assembleDebug
.\gradlew.bat testDebugUnitTest
```

调试包位于 `artifacts/rewang-debug.apk`。这不是正式签名发行包，也没有完成真机验收。

## 目录与队友文档

| 目录/文档 | 用途 |
|---|---|
| `android/` | 原生客户端，Java、XML、Canvas、HTTP和本地账户 |
| `web/` | 已同步的Web参考端及只读行情服务 |
| [PROJECT_GUIDE](docs/PROJECT_GUIDE.md) | 项目与分工 |
| [FRONTEND_MODULES](docs/FRONTEND_MODULES.md) | 原有页面逐块说明 |
| [DATA_API_GUIDE](docs/DATA_API_GUIDE.md) | 旧workspace字段与API |
| [REAL_MARKET_AND_ANDROID](docs/REAL_MARKET_AND_ANDROID.md) | 新市场API和原生流程，优先阅读 |

## 明确边界

真实登录、跨设备数据库、授权实时行情、后台持续采集、历史新闻截面、真实训练和大模型推理仍由后端接入。当前模型评估与AI页面保留明确标识的演示响应。Android原有账本编辑/CSV和部分复杂分析图表仍待迁移。不要将公开行情访问、调试构建或浏览器预览等同于生产验收。
