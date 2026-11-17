# ReWang 手机端前端与后端交接（2026-11-17）

## 1. 产品定位与运行入口

主产品为 Android 原生 App（Java + XML）。当前 `/mobile` 是可点击的移动端 Web 交互参考，不是 APK，不是 WebView 迁移完成证明。`/mobile/device` 提供真实390px iframe视口，仅用于浏览器验收响应式布局。根路径在800px及以下自动展示同一手机交互；桌面研究站可用 `/?desktop=1`。

核心目标：观察市场 → 筛选标的 → 分析收益风险 → 在历史截面模拟决策 → 推进交易日 → 评价结果和当时理由。AI不代替账户计算，不承诺预测或收益。

## 2. 统一信息架构

| 一级 Tab | 二级页面 | 目的 / 用户操作 |
|---|---|---|
| 行情（默认首页） | 行情、排行、行业、自选、个股详情 | 按名称/代码/拼音搜索；A/港/美市场与板块、行业筛选；排序；收藏；分时与日K；进入模拟 |
| 分析 | 收益、回撤、相关性 | A股最多3支同币种比较；20/60日报价区间；重新计算指标；导出JSON；转模拟 |
| 模拟 | 市场、关注、交易、持仓、复盘 | 建立10万元账户；选择历史起点；记录交易理由；买/卖验证；推进日期；重估资产；保留理由 |
| 研究 | 模型实验（配置/评估）、AI辅助 | 特征多选；模型配置；加载/取消/失败/重试；基线/混淆矩阵；实验JSON导出；模板问答 |
| 我的 | 功能目录、导出、来源、交接说明 | 找到所有页面；下载44股完整数据；确认服务边界 |
| 行情→公开行情 | 市场、资讯、模拟、持仓、更新 | 六家美股真实公开报价/历史、新闻、公告、60秒前台轮询、错误/来源/时间 |

全局 AppBar 右侧层叠图标也打开完整功能目录。主导航只保留5项，业务模块内部使用二级导航；进入新模块不跳到桌面页。浏览器返回键按 hash 恢复一级页面，已访问模块保持挂载，切换Tab保留本次交易状态。

## 3. 实现清单：不要混淆演示与生产

| 功能 | 当前Web手机端 | 当前Android Java项目 | 后端任务 |
|---|---|---|---|
| 行情目录44股、A港美、排行、搜索、分类、自选 | 已实现；价格/排名/状态为构造演示 | QuotesActivity原生目录已实现；未在本轮实机验收 | 全量证券主表、授权行情、分页/检索、持久化自选 |
| 个股分时/日K | 合成走势图、详情、模拟入口 | 原生Canvas日K/详情 | 日线/分时接口、复权口径 |
| 分析20/60日、3股比较、相关性 | 同一行情库实时前端计算 | 旧三股快照展示；尚未与新手机端功能对齐 | 同一公式的分析服务，数据版本和区间 |
| A股32股历史模拟、多股持仓/复盘 | 已实现，内存账户；刷新清空；示例账户含3成交2持仓 | 尚未迁移此完整多股账户 | 持久账户、交易事务、权限、交易规则 |
| 六家美股公开行情/新闻公告 | 已实现只读API，60秒轮询/缓存；可能延迟 | MarketActivity已实现同源API、单股纸面账户 | 换正式供应商，授权/限流/监控 |
| 模型实验/基线/混淆矩阵 | 固定50条样例；未真实训练 | 旧配置和固定评估；尚未对齐新版步骤UI | 时序训练任务、版本、评估、滚动验证 |
| AI辅助 | 本地模板，非大模型 | 模板 | 服务端LLM代理、上下文截断、流式响应 |
| 用户登录 | 登录表单/字段校验/本地演示会话已实现，非后端认证 | 尚无完整登录 | 必做：认证/续期/权限/用户隔离 |
| 统一5Tab视觉 | 已实现 | 仍为旧Activity导航，待迁移 | 不适用 |

**本项目尚不能宣称课程终验完成。** 课程要求Android登录/前后端配合：真实登录、原生界面一致性、持久化业务、真实模型与LLM仍需集成。浏览器检查不能替代模拟器/真机检查。

## 4. 页面与源文件映射

| 文件 | 职责 |
|---|---|
| `web/app/mobile/page.tsx` | App Shell、路由hash、完整目录、Analytics、ResearchArea、我的 |
| `web/app/mobile/app.css` | 移动端Token、排版、TabBar、安全区、嵌入模块样式；仅作用rw命名空间 |
| `web/app/quotes/page.tsx` / `quotes.css` | 证券目录与详情，共享组件 |
| `web/lib/quote-catalog.ts` | 44股元数据、演示报价和合成历史、筛选排序 |
| `web/lib/research.ts` | 真实计算函数：区间收益、样本波动×√252、回撤、共同日期Pearson |
| `web/app/simulate/page.tsx` | A股历史多股模拟；initialSymbol接收目录选股；example载入样例账户 |
| `web/app/market/page.tsx` | 六美股真实只读feed、资讯和纸面单股账户 |
| `web/lib/paper.ts` | 单股纸面账户计算/历史截断/校验 |
| `web/app/api/market/route.ts` | 已实现公开市场只读API |
| `android/app/src/main/java/com/rewang/app/` | Java Activities、API客户端、原生Canvas图表和单股PaperAccount |

## 5. 已实现API（可以现在调用）

`GET /api/market?symbol=AAPL&section=prices&range=1y`

- symbol：AAPL/MSFT/NVDA/AMZN/GOOGL/TSLA。
- section：prices / news / filings；range按现有API允许值。
- 报价提供symbol/name/currency/price/quoteAt/fetchedAt/source/timezone/exchange/priceBasis/delay/bars等。请以 `lib/market-feed.ts` 类型为准。
- bars为按日期排序的真实公开日线；history模式只显示cursor之前数据。
- 失败返回错误，UI保留旧快照并标注。严禁以演示值冒充真实数据。
- SEC不可用可能用公司官网发布/标明采集时间的披露快照。不是所有公司的实时公告流。

早期 `GET/POST /api/workspace` 是现有Web服务参考，包含D1/ChatGPT身份约定，**不是已经就绪的Android账号认证接口**。Android正式认证由队友实现独立适配。

## 6. 待实现API契约（设计，不是已存在的路由）

统一前缀 `/api/v1`；Bearer用户token；金额使用最小货币单位整数；时间为ISO8601且附交易所时区，日期YYYY-MM-DD；所有价格带currency/source/asOf/dataMode/delay。成功响应 `{data,requestId}`，失败 `{error:{code,message,field?},requestId}`。

| 按钮/页面 | 方法与路径（待实现） | 请求 | 响应/校验 |
|---|---|---|---|
| 登录 / 续期 / 退出 | POST `/auth/login`, `/auth/refresh`, `/auth/logout` | login: account,password | accessToken/refreshToken/expiresAt/user；401需登录；不在客户端存LLM key |
| 股票搜索/分类/分页/排行 | GET `/securities` | q,market,board,sector,sort,order,page,pageSize | items,total,facets,asOf；包含名称、代码、交易所、币种、状态；不同币种不混排成交额 |
| 个股详情/图表 | GET `/securities/{id}`；GET `/securities/{id}/bars` | interval,from,to,adjustment,asOf | 元数据/报价；OHLCV数组、复权口径、时区、延迟、缺失区间 |
| 自选添加/移除 | GET `/watchlist`；PUT/DELETE `/watchlist/{id}` | version或无body | 用户隔离、幂等增删、最新version |
| 新闻公告 | GET `/securities/{id}/articles` | type=news/filing,before,cursor,limit | title,url,publishedAt,source,availabilityTime；历史模式只返回截至asOf已公开资料 |
| 分析计算/导出 | POST `/analytics/compare` | securityIds(1–3),from,to,adjustment | series[returnPct,volatilityPct,maxDrawdownPct,points,observations]、correlation、method、dataVersion |
| 开始历史/当日模拟 | POST `/simulations` | mode,market,currency,startDate,initialCashMinor | id,cursor,version,cashMinor；时点必须是有效报价日 |
| 读取账户/持仓/成交 | GET `/simulations/{id}` | — | holdings,orders,fees,realized/unrealizedPnlMinor,equitySeries；后端权威重算 |
| 确认买入/卖出 | POST `/simulations/{id}/orders` | securityId,side,quantity,reason,expectedVersion,idempotencyKey | order/account；余额、持仓、整手、停牌、可用日期、T+1等按约定校验；事务防重 |
| 下一交易日 | POST `/simulations/{id}/advance` | expectedVersion | 新cursor、账户估值；不得回退后改历史成交 |
| 决策复盘 | GET/PATCH `/decisions/{id}` | reviewText,expectedVersion | 原始决策理由不可被后见数据覆写；保存review版本 |
| 运行模型实验 | POST `/experiments` | securityId,model,featureIds,from,to,split,seed | jobId,status；校验特征、样本量、按时间划分 |
| 加载/取消/评估 | GET `/experiments/{id}`；POST `/experiments/{id}/cancel` | — | status/progress/modelVersion/dataVersion；metrics、baseline、confusion、每行日期/概率/真实/预测 |
| AI提问/决策辅助 | POST `/research/messages`（SSE） | question,simulationId,decisionId,asOf | context/source/token/done/error事件；上下文仅截至asOf；数值来自计算接口；key在服务器 |
| 数据源/更新状态 | GET `/sources/status` | market | 上次成功、延迟、覆盖、错误、可重试；禁止给出虚假实时状态 |

### 订单请求示例（待实现）
```json
{"securityId":"300750.SZ","side":"buy","quantity":100,"reason":"根据截至模拟日的资料建立观察仓位","expectedVersion":2,"idempotencyKey":"client-generated-uuid"}
```

### 分析响应示例（结构，以实际计算为准）
```json
{"data":{"dataMode":"synthetic","currency":"CNY","from":"2026-08-24","to":"2026-11-13","dataVersion":"demo-v1","series":[{"symbol":"300750.SZ","observations":60,"returnPct":3.21,"volatilityPct":18.54,"maxDrawdownPct":-6.1,"points":[]}],"correlation":[],"method":"simple daily return; sample std * sqrt(252)"},"requestId":"sample"}
```

## 7. 后端对接原则

1. 用Repository/Service adapter替换当前demo状态，不在UI组件内拼接数据库查询。
2. 认证、交易、行情、分析、模型任务、LLM为不同服务边界；LLM不能自行改账户或伪造指标。
3. Demo / Live数据不得自动混合。切换市场显式重置币种上下文；行情延迟在页面可见。
4. 未来数据屏蔽发生在API层，不只隐藏前端图表。历史资讯需publication/availability时间，防后见信息。
5. 订单服务事务、幂等与版本冲突（409）；字段错误422；权限401/403；限流429；网络错误可重试。
6. Android需实现loading/empty/error/stale/offline、返回栈、Tab状态保留、键盘不挡CTA、安全区及字体缩放测试。

## 8. 页面验收脚本

- 打开/mobile，首屏行情；底部5Tab和顶栏功能目录可见。
- 搜索ndsd → 宁德时代；进入日K/自选/模拟；不能跳到桌面页。
- 分析选3股、切20/60日、收益/回撤/相关性；移除/搜索加入；检查指标随区间重算，JSON可导出。
- 模拟载入完整示例账户，看到两支持仓和三笔成交；复盘有原始理由；推进一天后估值变化。
- 交易前无账户、无理由、零/非整手数量、现金不足/持仓不足都有错误反馈。
- 研究：取消全部特征后不能运行；运行完成切评估；取消、失败开关、重试有状态反馈；混淆矩阵不与基线重叠。
- AI：空白消息不可提交，模板答案明确标识，未宣称调用DeepSeek。
- 公开行情：分别查看报价、资讯、更新；失败/延迟不变成模拟数据。
- 390/360窄屏检查水平溢出、TabBar遮挡、对话框关闭、返回路径。原生还必须另跑模拟器和真机。

## 9. 对照参考

- moomoo官方功能介绍（自选、个股资料、模拟交易）：https://www.moomoo.com/us/learn/overview
- moomoo官方自选说明（多维排序）：https://www.moomoo.com/us/learn/what-is-the-watchlist-tab
- 雪球官方FAQ（搜索、自选及组合）：https://www.xueqiu.com/about/faq

借鉴信息架构和操作路径，不复制品牌外观。回望区别是历史截面约束、决策理由保留、收益风险实际计算、模型基线和复盘联系。
