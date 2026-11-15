> **2026-11-15 增量说明：**已补充真实行情 API、新闻/公告回退、原生市场模拟流程、Gradle Wrapper和调试包构建。下文部分旧状态仅描述早期版本；以 [真实市场与Android交付](REAL_MARKET_AND_ANDROID.md) 为当前依据。

# 数据字典与后端对接指南

## 1. 先区分现有和待实现
- 现有 Android `ApiClient`：支持 HTTP JSON 请求；设置页实际发起 `GET <base>/api/workspace` 并携带 Bearer token。
- 现有 Web 默认展示：从 `frontend-demo.ts` 读取内存，不发 API 请求。
- `web/app/api/workspace/route.ts`：D1/ChatGPT Header 认证的早期参考，不能直接证明 Android 登录已打通。
- 下文的 auth / experiments / chat 端点是建议契约，尚未由代码完整实现，需团队冻结版本。

## 2. 统一类型与单位
| 类型 | 约定 |
|---|---|
| 金额 | 整数分，例如 10235 = $102.35。API 不用格式化字符串 |
| 份额 | 当前只支持正整数；无融资、做空或碎股 |
| 日期 | YYYY-MM-DD；必须是真实日历日期 |
| 时间戳 | ISO8601，服务端统一时区后序列化 |
| 百分数 | `5.01` 代表5.01%，不是0.0501 |
| 概率/相关系数 | 概率0—1；Pearson −1—1 |
| 缺失值 | 使用 null；不得用0冒充无样本、无报价 |
| 标的代码 | 大写、稳定唯一；名称只是展示字段 |
| source | 来源说明，不是“已验证来源”的认证标记 |

## 3. workspace 读取结构
完整可运行的字段样例：[`../android/app/src/main/assets/workspace-demo.json`](../android/app/src/main/assets/workspace-demo.json)。后端先用这个响应跑通客户端，再替换数据库。

| 顶层字段 | 类型 | 使用位置 |
|---|---|---|
| accounts | array | 账户选择器（Android未迁移） |
| selected | object/null | 当前账户 id/name/currency |
| instruments | array | 标的选择器、来源目录 |
| prices | array | 单标的价格查询 |
| flows / trades / notes | array | 账本、复盘、事件统计 |
| ledger | array | 每日估值、组合曲线、当前持仓 |
| market | object，按symbol索引 | 单标的区间指标 |
| research | object | 跨标的分析 |
| comparison | object/null | 实际路径与规则路径 |
| asOf | date/null | 最新数据日期 |
| dataKind | string | empty / synthetic / mixed_or_imported |
| methodVersion | string | 计算口径版本 |

### 3.1 原始记录
| 对象 | 关键字段 |
|---|---|
| account | id、name、currency（USD）；真实后端 owner_id 由登录身份关联 |
| instrument | symbol、name、currency、price_type、source、data_kind、imported_at |
| price | symbol、price_date、close_minor、source |
| flow | id、account_id、effective_date、kind(deposit/withdrawal)、amount_minor、memo、sequence、created_at |
| trade | id、account_id、effective_date、symbol、side(buy/sell)、quantity、price_minor、fee_minor、sequence、created_at |
| note | id、account_id、trade_id/null、reason、expectation、review、created_at、updated_at、reviewed_at/null |

同日事件用 sequence 决定先后。笔记中的历史理由不参与资产计算。删除交易后其关联笔记如何处理需冻结策略：当前 Web 内存演示会解除关联，早期服务端参考会删除关联笔记，两者不一致，正式后端建议解除关联保留笔记并返回提示，前端同步。

### 3.2 计算记录
`ledger[]`：date、cashMinor、netContributionsMinor、assetsMinor/null、pnlMinor/null、holdings（symbol→整数份额）、prices（symbol→{closeMinor,priceDate}）。priceDate 是实际使用的报价日，不一定等于估值日，不能隐藏陈旧报价。

`research.series[]`：symbol、observations、returnPct/null、volatilityPct/null、maxDrawdownPct/null、positiveDays、returnDays、returns[{date,value}]、points[{date,index,drawdown,ma20/null}]。
`research.correlation[]`：symbol、values[{symbol,value/null,n}]。相关性必须对齐共同收益日，不能把不同行直接配对。
`market[symbol]`：periodReturnPct、maxDrawdownPct、volatilityPct、observations、firstDate、lastDate；这里波动口径见 `analysis.ts`，不要与research全区间口径混淆。
`comparison`：symbol、error/null、actual[]、baseline[]（各元素与ledger相似）；早期接口还提供feeRule。

## 4. 查询建议
```http
GET /api/workspace?account=1&symbol=DEMO_A&from=2026-08-17&to=2026-11-06
Authorization: Bearer <user_access_token>
```
上面参数已在早期 Web 路由实现，但当前 Android 设置页只发送无参数GET。App后续实现筛选时再传参。

后端应先读取完整历史事件重放，再过滤展示区间。不要直接只查询from之后交易。未授权账户返回403/404，不返回其他用户数据。

## 5. 写入动作（Web Editor 已有字段，App待迁移）
统一参考 `POST /api/workspace`；正式服务也可设计REST资源端点，但须同步客户端适配器。
| action | 请求字段 |
|---|---|
| account.create | name |
| flow.save | accountId、id(编辑时)、date、kind、amountMinor、memo |
| flow.delete | accountId、id |
| trade.save | accountId、id(编辑时)、date、symbol、side、quantity、priceMinor、feeMinor |
| trade.delete | accountId、id |
| note.save | accountId、id(编辑时)、tradeId/null、reason、expectation、review |
| note.delete | accountId、id |
| market.import | symbol、name、source、priceType、csv |

现有动作响应参考：创建账户 `{id}`；写入 `{ok:true}`；导入 `{symbol,count}`。建议正式接口统一返回新记录id和accountVersion，但这是待协商扩展，不是当前已有功能。

每笔交易要求当日有价；数量和金额范围校验；编辑/删除要校验所有后续事件；历史更新必须在数据库事务中原子执行。账户归属不能只靠客户端accountId。

## 6. 模型实验待实现契约
- POST `/api/experiments`：symbol、model、features、trainRange、validationRange、testRange；返回 experimentId/status。
- GET `/api/experiments/:id`：status、progress、error、dataVersion、modelVersion、split、metrics、baselineMetrics、confusionMatrix、predictions。
- status建议 queued/running/succeeded/failed/cancelled；客户端模拟的idle/success需适配。
- split每段包含from/to/count；predict行包含sampleId/date/actual/predicted/upProbability。
- 明确positive class为上涨；accuracy、precision、recall、f1建议以0—1传输，前端转百分数。
- 首次只实现一个模型即可，后续再扩展。按时间划分、标准化仅拟合训练集、测试集不用于选参。
- 真实结果不得继续混用固定模拟矩阵；记录准确的样本、数据版本和运行时间。

## 7. AI 服务待实现契约
POST `/api/research/chat`：messages、accountId、symbol、from、to、contextVersion。
后端重新查询有权限的数据并构建上下文，模型只能解释已给出的指标；缺少数据时必须说明。
建议SSE事件：`token`(text)、`done`(requestId/model/usage/contextVersion)、`error`(code/message/requestId)。停止生成需关闭客户端流并尽可能取消服务端请求。
DeepSeek 服务商地址与准确 model ID 尚待确认；API key留服务器秘密配置，绝不提交Git或打包App。
用户Token与大模型key是两类凭据，不能混用。

## 8. 登录与错误结构
建议 `/auth/login`、`/auth/refresh`、`/auth/logout`；当前项目未冻结其请求字段和token生命周期，需要后端负责人确认。不要直接套用其他课程项目的认证设计。
早期Web错误结构可沿用：
```json
{"error":{"code":"VALIDATION_ERROR","message":"该日期没有标的报价"}}
```
建议补充requestId。HTTP建议400参数、401认证失效、403权限、404资源、409冲突、429限流、5xx服务端。
Android当前展示HTTP状态和截断后的错误正文；下一步需把错误码映射为清晰中文，同时保留requestId便于排查。
