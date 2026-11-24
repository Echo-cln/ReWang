# 回望 v25：数据分析与模型实验交接

更新：2026-11-24。适用 `web/` 手机端Web交互参考。最终Android需用Java+XML迁移。本轮没有修改APK或实现服务端认证。

## 1. 验收入口与产品流程

打开 `/mobile/device`，顶部标记“预览 v25 · 非APK”。底部“分析” → 数据分析。

二级栏目：市场分析 / 个股对比 / 账户分析 / 决策复盘。上方另有模型实验与AI研究入口。

1. 市场分析：先看涨跌分布与行业表现，按名称、代码或拼音首字母搜索，叠加行业与风险条件排序。
2. 个股对比：1–3支A股标准化价格、回撤路径、收益波动与Pearson相关性。
3. 在相应历史日开始模拟，记录买卖、数量和决策理由；已有账户时沿用账户，不因换股票清空。
4. 账户分析读取同一份账户，逐日计算权益、盈亏贡献、仓位、行业集中度和对照曲线。
5. 决策复盘逐条展开交易理由、5/10/20日报价观察、当前价格变化与观察期低点；用户填写假设验证状态和复盘备注。
6. 模型实验使用合成价格在浏览器真实训练逻辑回归；历史日期不足时显示错误；独立完整区间研究与历史交易隔离。

### 演示

账户为空时可“载入演示账户”；已有账户的替换操作需确认。示例3笔交易、2支持仓，包含分批建仓与减仓；起点2026-07-21、当前2026-08-11。总资产100354.06元、累计手续费17.94元、净盈亏354.06元。该值由行情和账本计算，不是写死在组件里。推进一天，所有账户分析随日重估。

## 2. 指标与交互

| 功能 | 计算/交互 | 边界 |
|---|---|---|
| 历史截面 | `asOf`截断历史，20/60报价日向前取窗 | 不是按自然日；样本不足显示实际数量 |
| 涨跌分布 | 当日收盘相对前一报价日；统计32支A股 | 不是全市场数据 |
| 行业表现 | 当前样本行业内个股当日收益等权平均 | 不代表官方行业指数；不是资金流 |
| 条件筛选 | 上涨>0；窗口最大回撤≥−5%；年化波动≤20% | 均为研究过滤条件，不是买卖评级 |
| 排序 | 窗口收益降序、当日涨幅降序、回撤较小、波动较低 | 所选日期/窗口改变即重算 |
| 风险观察 | 最差日、最长连跌、年化波动、报价数量 | 行展开后自动定位详情；再点击关闭 |
| 个股对比 | 同一截止日、共同日期相关性、起点价格100 | 不含分红；不是总回报 |
| 权益曲线 | 按逐日历史持仓×价格+现金重放 | 固定初始10万元，无追加资金 |
| 买入持有对照 | 在模拟起点固定标的，整手尽量买入，计首次费用 | 不允许事后根据交易反选标的；不证明择时能力 |
| 样本等权篮子 | 固定32支起点等额、碎股买入后持有，无再平衡 | 自定义参考，非真实指数，不计费用 |
| 盈亏贡献 | 平均成本法，买入费用计成本、卖出费用计已实现盈亏 | 含已清仓股票，合计与账户净盈亏对齐 |
| 持仓风险 | 股票/现金占总资产、行业/个股权重、持仓收益相关性 | 不把低相关性当作风险消除保证 |
| 决策复盘 | 原始交易理由只读；另存假设状态和复盘备注 | 卖出后涨幅是机会成本，非实际亏损 |
| 观察窗口 | 买入/卖出后5/10/20报价日的价格变化 | 未到的日期显示“待观察”，不泄漏未来 |
| 数据摘要 | 当前涨跌、观察期低点、经过的报价日 | 本地计算模板，未调用LLM |
| 导出 | 分析宇宙、区间、账户快照/逐日曲线、备注JSON | 模拟账户，不含真实凭据 |

## 3. 状态共享与持久化

- `lib/portfolio-analysis.ts` 是共享数据适配层：`SimSnapshot`、`SimOrder`、`readAccount`、`writeAccount`、`ledger`、`accountAnalysis`、`marketAnalysis`、`orderReview`。
- 本机模拟账户键：`rewang.simulation.v2`，版本2；原生/后端可沿用字段含义，不应直接信任客户端的现金和盈亏。
- `rewang:simulation` 自定义事件通知分析页刷新；`rewang:load-account`通知已挂载模拟页恢复外部载入的演示账户。浏览器storage事件同步其他标签的分析视图。
- 复盘键：`rewang.review.v1`，按订单ID保存`{note,verdict}`；实际服务端需与用户ID/账户ID/交易ID关联。
- 模拟日期默认绑定分析日期；用户可切独立历史研究。账户分析及交易复盘永远按账户cursor计算。
- 独立研究日期晚于当前模拟日时不能直接从该分析进入历史下单；先恢复模拟时间。模型完整区间研究也不向下单注入未来预测。
- 刷新恢复账户和复盘；重置账户将清空本机当前账户，旧导出文件可作外部留存。没有实现多账户服务。

## 4. 真实浏览器模型实验

文件 `lib/temporal-model.ts`、`components/research/model-lab.tsx`。

- 模型：L2逻辑回归，批量梯度下降500轮；这是轻量实验，不是市场预测服务。
- 标签：下一报价日收盘高于当前日为1，否则0；最新无标签日剔除。
- 特征：过去5日收益、20日收益标准差、相对20日均线偏离、1日收益，可多选。
- 标准化：仅训练集均值/标准差，作用于验证与测试。
- 时间切分：约60/20/20；标签跨切分边界的训练/验证样本剔除。
- 验证集：在预定义阈值网格0.35–0.65选择阈值，测试集不选阈值。
- 基线：训练集多数类别固定预测，再在同一个测试集评估。
- 展示：实际训练/验证/测试日期和数量、Accuracy、Precision、Recall、F1、混淆矩阵、逐日预测、未校准概率、可导出实验参数与结果。
- 约束：至少30条可用样本；短序列会明确报错。没有实现随机森林、滚动验证或概率校准。旧桌面实验仍为固定样例，不得和手机新模块混称。

### 数据解释预览

`components/research/evidence-assistant.tsx`从同一账户与截止日提取盈亏、仓位、行业、费用、基准差及历史订单。三类问题生成可核对的本地摘要，并能导出`rewang-research-context.json`。页面明确未调用大模型；不提供通用问答。

### 演示数据文件

`public/analytics-demo.json`可从“我的→数据与导出”下载，包含完整示例账户、权益曲线、贡献统计、32股市场截面和一次真实训练结果。运行`node scripts/export-analytics-demo.mjs`可按同一计算逻辑重建。模型样例为独立完整区间研究，不与账户早期日期混用。

## 5. 后端建议契约（当前未实现这些服务）

| 接口 | 关键输入 | 必须返回 |
|---|---|---|
| GET /api/analytics/market | asOf,lookback,universeVersion,filters,sort | 样本范围、有效日期、涨跌分布、行业统计、个股指标、来源 |
| POST /api/analytics/compare | symbols,asOf,lookback,adjustment | 对齐序列、指标、相关性、共同样本数 |
| GET /api/accounts/:id/analytics | asOf,benchmarkId | 现金/仓位、权益曲线、费用、各股和行业贡献、基准方法 |
| GET /api/accounts/:id/reviews | cursor | 交易原始依据、可见观察窗口；禁止返回未来结果 |
| PUT /api/orders/:id/review | verdict,note,revision | 持久化结果、更新时间、版本；不覆盖原始下单理由 |
| POST /api/experiments | symbol,asOf,features,model,split | 任务ID、状态、真实版本；完成后返回参数/切分/评估 |
| POST /api/research/assistant | accountId,orderId,asOf,question | 基于可见数据和证据ID的解释，不由LLM计算账本 |

必须实现服务端账户权限、交易事务、幂等、防止倒填历史交易、单位/币种、复权、交易日历、来源与更新时间。客户端计算用于演示，后端上线后服务端账本为准。LLM密钥只放服务端。不能将合成公告或价格冒充真实。

## 6. 前端迁移到Java+XML

- AnalysisFragment：顶部TabLayout，四个子Fragment；沿用现有米白/深蓝/赭色，不套Web桌面缩放。
- MarketAnalysisFragment：RecyclerView行业榜/筛选结果，日期和窗口控件。
- CompareFragment：折线图、指标列表、相关性表。
- AccountAnalyticsFragment：权益/回撤图、贡献列表、仓位分布。
- DecisionReviewFragment：交易时间线、详情、状态选择、备注。
- ViewModel+Repository共享账户和asOf；使用LiveData驱动，不让每个Fragment维护独立账本。
- 服务端模型结果走Repository；当前TS逻辑回归不是TFLite文件，未自动迁移Android。

## 7. 检查

执行 `node scripts/check-analytics.mjs`：16项确定性检查，覆盖盈亏对齐、清仓、逐日权益、日期截止、观察窗口、固定基准、时序切分、混淆矩阵及未来价格改变不影响旧截面训练。

另运行 `./node_modules/.bin/tsc --noEmit` 与生产构建。浏览器覆盖360/390/430px、筛选、复盘保存、日期推进同步、模型成功/样本不足。浏览器检查不等于Android真机验收。

## 8. 参考与取舍

- 同花顺官方产品页：https://download.10jqka.com.cn/phone/ ：行情、自选资讯、预警、投资账本与模拟投资。
- 东方财富组合说明：https://groupwaphk.eastmoney.com/group/invest/introduce.html
- Choice官方手册：https://choice.eastmoney.com/FileDownLoad/CFTG20221115.pdf ：权益、持仓、盈亏、调仓历史与组合分析。

保留适合教学模拟的查询、比较、账户分析与复盘。未复制券商交易、Level-2资金流、商业诊股或宣称真实行情覆盖。完整生产数据接入、服务端认证、LLM和Android迁移仍由后续联调完成。


---
以下为历史版本记录，与v25冲突时以v25为准。

## v24 共享字体与排版验收

桌面和手机标题共同使用同一个本地WOFF2字体（ReWang Editorial，基于SIL OFL授权的Noto Serif CJK SC Bold按当前页面字符子集化，许可证在public/fonts/LICENSE-NOTO.txt）。两端共享--font-editorial及700字重，避免Windows宋体、macOS宋体及Linux回退字体不同造成品牌变化。正文继续采用系统无衬线字体。字体通过站点自身加载，不依赖外部字体CDN。

手机标题40px（360px窄屏36px），模块标题约19px、正文16px、常用标签14px、辅助信息12–13px。开始前的日期选择和开始按钮在同一列，均46px高；开始后为起点文字和整行推进按钮。手机预览外壳显示“预览 v24”，用于识别旧标签页，不在正式App业务页展示版本提示。

## v23 手机端品牌与回放控件修订

首页统一使用桌面端Logo和“看见数据，也看见决定”的深蓝/陶土色双行标题，按钮为查看股票行情/进入模拟账户。删除“发现市场、比较风险、验证假设”快捷行；“市场一瞥”改为“市场概况”，用实际业务名称。

历史回放控制组件由旧三列flex改为专用sim-clock-panel：顶行当前模拟日期/重置账户；完整ISO日期及第N个报价日；不可拖动的回放进度；未启动时显示起点选择、启动后显示起点文本；底部整行推进按钮。当前日期不可编辑，防止回退后修改成交。360px实测日期单行、无横向溢出；推进一天会同步日期及账户估值。

## 2026-11-17 视觉修订（v22）

恢复独立首页，默认入口为首页，不再以行情列表替代首页。底部一级导航为：首页 / 行情 / 分析 / 模拟 / 我的。分析页顶部“数据分析 / 模型实验 / AI研究”访问研究模块。模拟及公开行情的二级导航使用纯文字标签，不再复用图标TabBar。行情板块/行业筛选可折叠，排行榜工具只在排行页展开。

首页包含品牌首屏、历史模拟入口、市场概览、三股风险研究专题、个股切入和历史练习入口；各项均连接现有交互。下文v21的信息架构如与本段冲突，以本段为准。原生迁移状态不因此改变。

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
