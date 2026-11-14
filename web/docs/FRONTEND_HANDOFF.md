# 回望前端交付

## 运行
Node.js >=22.13；npm install；npm run dev。生产构建 npm run build。
首页与 /login 均为无需后端的前端演示。所有编辑仅保存在当前页面 React 内存；刷新恢复案例。无真实登录、训练、大模型调用。

## 数据层替换
app/workspace.tsx 中 load 调用 lib/frontend-demo.ts 的 demoView；act 调用 demoMutate。队友应在这里接入自己的 API，避免改动展示组件。
GET /api/workspace 的现有实现可作为字段参考，但演示前端不调用它。返回字段：accounts、selected、instruments、prices、flows、trades、notes、ledger、market、research、comparison、asOf、dataKind、methodVersion。
金额用整数分，日期 YYYY-MM-DD，收益/波动/回撤字段用百分数（如 5 表示 5%），模型概率用 0—1。
写入动作 account.create、flow.save/delete、trade.save/delete、note.save/delete、market.import 及字段见 Editor.submit；真实服务必须验证归属、金额、日期、余额和持仓。

## 模型实验对接建议
POST /api/experiments：symbol、model、features、trainRange、validationRange、testRange；返回 experimentId、status。
GET /api/experiments/:id：status(idle/running/succeeded/failed)、progress、error、modelVersion、dataVersion、split、confusionMatrix、metrics、baselineMetrics、predictions。
当前 app/model-lab.tsx 使用固定 50 条评估样例，所有指标来源于 TP18、TN14、FP8、FN10，并非训练结果。时间划分 60/20/20 为界面示意；真实样本日期及划分由后端返回。

## 大模型接口对接建议
POST /api/research/chat：messages、accountId、symbol、from、to、contextVersion；后端按账户授权查询上下文，返回 SSE token/done/error。
app/assistant-panel.tsx 的 send 是模拟流式输出替换点。模型服务 base_url 与准确 model ID 待确认。绝不把 API key 放入前端环境变量、源码或 localStorage。Windows 密钥文件仅由队友本地后端读取，部署后改用服务端秘密配置。

## 页面验收
首页 → 分析中心 → 模型实验运行及失败重试 → AI 研究发送、停止及失败重试 → 市场研究切标的 → 投资组合 → 规则对照 → 账本增改删 → 决策笔记增改删 → CSV 导入 → 日期筛选 → 登录演示。
已实现空账户状态：新建空账户即可观察；重载完整案例恢复初始数据。导航为横向结构，小屏可横向滚动。数据均标明合成来源。

## 分工边界
此交付是 Web 前端及模拟数据。真实鉴权、数据库、训练与推理、后台作业队列、Android 原生 App 由后续队友实现。课程整体完成度不等于此 Web 前端完成度。
