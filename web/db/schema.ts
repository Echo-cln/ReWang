import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  version: integer("version").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, t => [index("accounts_owner_idx").on(t.ownerId)]);

export const cashFlows = sqliteTable("cash_flows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  effectiveDate: text("effective_date").notNull(),
  kind: text("kind").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  memo: text("memo").notNull().default(""),
  sequence: integer("sequence").notNull(),
  createdAt: text("created_at").notNull(),
}, t => [index("flows_account_date_idx").on(t.accountId, t.effectiveDate)]);

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  effectiveDate: text("effective_date").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  quantity: integer("quantity").notNull(),
  priceMinor: integer("price_minor").notNull(),
  feeMinor: integer("fee_minor").notNull().default(0),
  sequence: integer("sequence").notNull(),
  createdAt: text("created_at").notNull(),
}, t => [index("trades_account_date_idx").on(t.accountId, t.effectiveDate)]);

export const decisionNotes = sqliteTable("decision_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  tradeId: integer("trade_id").references(() => trades.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  expectation: text("expectation").notNull().default(""),
  review: text("review").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  reviewedAt: text("reviewed_at"),
}, t => [index("notes_account_idx").on(t.accountId)]);

export const instruments = sqliteTable("instruments", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  priceType: text("price_type").notNull(),
  source: text("source").notNull(),
  dataKind: text("data_kind").notNull(),
  importedAt: text("imported_at").notNull(),
});
export const dailyPrices = sqliteTable("daily_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull().references(() => instruments.symbol, { onDelete: "cascade" }),
  date: text("price_date").notNull(),
  closeMinor: integer("close_minor").notNull(),
  source: text("source").notNull(),
}, t => [uniqueIndex("prices_symbol_date_unique").on(t.symbol, t.date)]);
