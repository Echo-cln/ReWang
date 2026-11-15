# 真实市场、历史模拟与 Android 交付

更新：2026-11-15。本文件是本轮增量的交付依据；早期文档中“无行情服务 / 无 Wrapper / 无 APK 构建”的描述已过时。

## 1. 入口与完整操作路径

- 站点首页主按钮“进入真实市场与历史模拟”，或打开 `/market`。
- 手机底部五个 Tab：市场、资讯、模拟、持仓、更新。桌面左侧目录仅用于预览切页，不是 Android App 的侧栏。
- 市场：搜索六家公司的代码/英文名称，切换日线区间，关注标的，查看区间价格变化、年化日波动和最大回撤。
- 资讯：新闻与官方公告分 Tab 展示，标题链接原文，显示发布时间及来源。
- 模拟：选择历史日期建立 $100,000 单标的账户，输入整数股数和理由，模拟买卖，推进到下一交易日。
- 持仓：显示现金、持仓市值、资产、累计/浮动/已实现盈亏，查看成交费用和当时的理由，导出 JSON。
- 最新快照模拟：按最近公开报价练习当前决策；没有未来行情时不能立即评价决策结果。
- 更新：逐项显示行情、新闻、披露的成功/错误、采集时间及来源回退方式。

`/mobile` 仍是分析中心等页面的手机交互参考，默认使用合成案例；`/simulate` 是不依赖上游服务的六支虚构股票案例。不同入口的数据集与账户没有自动合并。

## 2. 真实接入了什么

| 数据 | 实现 | 时效与限制 |
|---|---|---|
| 六家美股 | AAPL / MSFT / NVDA / AMZN / GOOGL / TSLA | 不是全市场，也不是 A 股 |
| 日线及最近报价 | Yahoo Finance Chart → 服务端 JSON 适配器 | 公开源可能延迟，非交易所授权逐笔实时 |
| 新闻 | Yahoo Finance RSS | 只展示标题/时间/原文链接，可能包含综合市场消息 |
| 监管申报 | SEC EDGAR Submissions | 优先在线读取；目前发布环境可能返回 403 |
| 公司发布 | Apple / Microsoft / NVIDIA 官网 RSS/Atom | SEC 受限时回退；产品发布不等同于监管申报 |
| 已核验 SEC 快照 | `web/lib/filings-snapshot.json` | 真实公开采集，不是合成数据；显示采集时间，不冒充实时 |

### 更新机制

页面/Activity 在前台时每 60 秒请求，后台停止；这是**轮询**，不是 WebSocket 逐笔行情。服务端固定上游域名和股票白名单，行情缓存 60 秒、新闻 10 分钟、披露 30 分钟，并合并同键并发请求。上游超时 12 秒。失败返回 502，不生成假行情补位。缓存为 Worker 实例内缓存，不是数据库中的永久采集仓库。没有页面打开时不运行定时采集任务。

SEC 回退分别标识 `sourceMode=issuer` / `verified_snapshot`，真实在线 SEC 为 `sec_live`。快照 `fetchedAt` 是采集时间；`attemptedAt` 是本次在线尝试时间，不能混淆。

公开端点能够访问不代表已取得商业使用许可，课程演示之外需要队友替换为有许可且稳定的数据商适配器。

## 3. API 契约

`GET /api/market?symbol=AAPL&range=1y&section=prices`

- `range` 白名单：`1mo/3mo/6mo/1y/2y/5y`。
- `section`：`prices/news/filings`。
- 无客户端密钥；这是公开只读 API，不承载私人账户数据。
- 参数错误 HTTP 400；上游不可用 HTTP 502，含 `error/sourceStatus/retryAfterSeconds`。
- `prices`：`symbol,name,sector,currency,exchange,timezone,price,quoteAt,fetchedAt,bars,corporateActions,source,priceBasis,delay`。
- `bars[]`：`date,time,close,volume`；close 是美元数值，不是美分。与旧 workspace API 的 `_minor` 字段不同。
- `news/filings`：`items[{title,url,publishedAt,source,form?}],source,fetchedAt`；披露可能附加 `warning/snapshot/sourceMode/attemptedAt`。
- 原始报价和采集时间为 ISO 时间，交易所时区单独返回；不要将抓取时间当作成交发生时间。

## 4. 模拟与分析口径

- 单标的、美元账户，初始资金100000；美股整数股，不使用 A 股100股手数规则。
- 模拟费用成交额0.1%，最低$1；只是统一练习规则，非真实券商收费。
- 买入成本包括买入费用；部分卖出按平均成本释放成本；已实现盈亏扣除卖出费用。
- 现金/金额四舍五入到美分；保存每笔理由、报价和费用。
- 余额不足、超额卖出、无理由、无有效报价、回到过去成交均被拒绝。
- 日线未复权；有拆股的历史区间会阻止成交。未处理分红再投、税费、滑点、交易所撮合等，不能把模拟收益当作实际可实现收益。
- 历史账户使用游标日期及以前的数据绘图和计算；保守排除最新一条日线，因为它可能尚未收盘。
- 当前新闻不自动注入历史回放。历史公告时间截面检索、当时可知财报库尚未实现。
- 区间变化 `last/first-1`，最大回撤 `min(close/runningPeak-1)`，年化波动为日收益样本标准差×√252。
- 复盘文字目前由确定性规则统计生成，**不是大模型结论**。原有模型实验仍为明确标识的固定评估样例。

## 5. Android 原生代码

Android Studio **打开 `android/`**，不能只打开整个仓库根目录。Java17，Android SDK35，Gradle8.9，AGP8.7.3，minSDK26。

```powershell
cd ReWang\android
.\gradlew.bat assembleDebug
.\gradlew.bat testDebugUnitTest
```

- `MainActivity`：原有分析与研究页面，改为底部导航，更多页面通过研究目录进入。
- `MarketActivity`：原生行情/资讯/历史模拟/持仓/更新五个 Tab。
- `MarketChart`：Canvas日线绘制，支持历史游标截断。
- `PaperAccount`：费用、现金、持仓与已实现盈亏计算。
- `ApiClient`：HTTPS、异步线程池、主线程回调、超时、HTTP错误。
- `activity_main.xml`：原生页面骨架与固定底部导航。
- 关注和模拟账户通过 SharedPreferences 保存，JSON可用系统文件选择器导出；不会上传私人账户到公开市场 API。
- 默认 API 地址是本项目站点；更换后端时修改 `MarketActivity.BASE`，保留上述 JSON 契约。
- 没有 WebView，没有把浏览器页面装进 Android。没有在 APK 中嵌入大模型密钥。

## 6. 仍需队友负责的边界

本轮完成真实公开市场的读取和原生核心流程，并不等于整套生产后端已经完成。登录/鉴权、跨设备账户数据库、稳定授权行情、后台持续采集、历史新闻知识库、真实 ML 训练与大模型推理仍需接入。旧 MainActivity 的账本增改删、CSV导入、完整Web分析图表也没有全部迁移；不能将浏览器参考端的每个控件视为已有原生实现。交付的调试APK不是正式签名发布包。

本环境可以构建和执行JVM测试，但没有 Android 模拟器/真机运行验收条件；实际设备上的输入法、旋转、字体缩放和不同屏幕仍需要测试。浏览器手机外观验证不替代 Android 实机验收。
