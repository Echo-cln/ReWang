import test from 'node:test';
import assert from 'node:assert/strict';
import { baseline, replay, validateLedger } from '../lib/analysis.ts';
import { fullDemoScenario } from '../lib/demo.ts';

test('complete demo fills every analysis surface with a coherent synthetic history', () => {
  const { market, flows, trades, notes } = fullDemoScenario();
  assert.equal(market.instruments.length, 3);
  assert.ok(market.prices.length >= 60);
  assert.equal(trades.length, 7);
  assert.equal(flows.filter(x => x.kind === 'deposit').length, 2);
  assert.equal(flows.filter(x => x.kind === 'withdrawal').length, 1);
  assert.equal(notes.length, 3);
  assert.ok(notes.some(x => x.review && x.reviewedAt));
  assert.ok(notes.some(x => !x.review && !x.reviewedAt));
  const f = flows.map(x => ({...x, id: 0, account_id: 1, created_at: ''}));
  const t = trades.map(x => ({...x, id: 0, account_id: 1, created_at: ''}));
  assert.equal(validateLedger(f, t), null);
  const history = replay(f, t, market.prices);
  assert.ok(history.length > 20);
  assert.ok(history.at(-1).cashMinor > 0);
  assert.equal(Object.entries(history.at(-1).holdings).filter(([, n]) => n > 0).length, 3);
  const comparison = baseline(f, market.prices, 'DEMO_A');
  assert.equal(comparison.error, null);
  assert.ok(comparison.series.length > 20);
  assert.notEqual(comparison.series.at(-1).assetsMinor, replay(f, t, market.prices, true).at(-1).assetsMinor);
});
