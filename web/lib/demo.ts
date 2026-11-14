import { feeFor, syntheticPrices, validateLedger, type Flow, type Trade } from "./analysis.ts";

export const DEMO_ACCOUNT_NAME = "回望课程演示 · 合成数据";

type DemoFlow = Omit<Flow, "id" | "account_id" | "created_at">;
type DemoTrade = Omit<Trade, "id" | "account_id" | "created_at">;
type DemoNote = { tradeSequence: number | null; reason: string; expectation: string; review: string; createdAt: string; reviewedAt: string | null };

export function fullDemoScenario() {
  const market = syntheticPrices();
  const priceAt = (symbol: string, day: number) => {
    const price = market.prices.filter(p => p.symbol === symbol)[day];
    if (!price) throw new Error(`演示报价缺失：${symbol} / ${day}`);
    return price;
  };
  const flows: DemoFlow[] = [];
  const trades: DemoTrade[] = [];
  let sequence = 0;
  const cash = (day: number, kind: Flow["kind"], amount_minor: number, memo: string) => {
    flows.push({effective_date: priceAt("DEMO_A", day).price_date, kind, amount_minor, memo, sequence: ++sequence});
  };
  const trade = (day: number, symbol: string, side: Trade["side"], quantity: number) => {
    const price = priceAt(symbol, day);
    trades.push({effective_date: price.price_date, symbol, side, quantity, price_minor: price.close_minor, fee_minor: feeFor(quantity * price.close_minor), sequence: ++sequence});
  };

  cash(0, "deposit", 1_500_000, "课程演示：初始入金");
  trade(0, "DEMO_A", "buy", 45);
  trade(7, "DEMO_B", "buy", 35);
  cash(15, "deposit", 400_000, "课程演示：追加资金");
  trade(15, "DEMO_C", "buy", 22);
  trade(28, "DEMO_A", "sell", 10);
  cash(35, "withdrawal", 100_000, "课程演示：生活费出金");
  trade(42, "DEMO_B", "buy", 20);
  trade(51, "DEMO_C", "sell", 8);
  trade(57, "DEMO_A", "buy", 10);

  const notes: DemoNote[] = [
    {tradeSequence: trades[0].sequence, createdAt: `${trades[0].effective_date}T10:30:00.000Z`, reviewedAt: `${priceAt("DEMO_A", 28).price_date}T17:00:00.000Z`, reason: "初始入金后没有一次性投入全部资金；先买入山岚指数，保留现金以观察后续波动。", expectation: "检验分批建仓与一次性投入的差别；若价格下行，不以单日变化替代长期判断。", review: "第 28 个报价日卖出一部分仓位用于控制暴露。该结果只说明这条合成路径的历史变化，不能证明策略未来有效。"},
    {tradeSequence: trades[2].sequence, createdAt: `${trades[2].effective_date}T11:00:00.000Z`, reviewedAt: null, reason: "新增资金后配置第三组演示标的，观察组合波动与单一标的的差异。", expectation: "后续比较实际持仓与固定规则基准；暂不把短期上涨视为模型预测能力。", review: ""},
    {tradeSequence: null, createdAt: `${priceAt("DEMO_A", 35).price_date}T15:00:00.000Z`, reviewedAt: `${priceAt("DEMO_A", 52).price_date}T17:00:00.000Z`, reason: "提出 1,000 美元用于模拟现实现金需求，避免把账户收益与新增资金混淆。", expectation: "出金后仍保留多标的持仓，观察净投入与总资产的相对变化。", review: "复盘时将同一笔出金应用于两条路径，并按各自的持仓与现金重新估值。"},
  ];
  const error = validateLedger(flows.map(f => ({...f, id: 0, account_id: 0, created_at: ""})), trades.map(t => ({...t, id: 0, account_id: 0, created_at: ""})));
  if (error) throw new Error(`演示案例账本校验失败：${error}`);
  return {market, flows, trades, notes};
}
