import {AMOUNT_SCOPE_STOCK_HOLDINGS} from "../shared/amountScopes"
import type {DividendEvent, StockQuote} from "../shared/stocks"

import {getDb} from "./database"

type StockQuoteRow = {
  symbol: string,
  name: string,
  price: number,
  previous_close: number,
  change: number,
  change_percent: number,
  currency: string,
  change_1m: number | null,
  change_6m: number | null,
  change_1y: number | null,
  change_2y: number | null,
  dividends: string | null,
  updated_at: number,
}

type StockAmountRow = {symbol: string, amount: number}

type ScopedStockAmountRow = {scope: string, symbol: string, amount: number}

type ScopedStockTargetWeightRow = {scope: string, symbol: string, weight: number}

type DisabledSymbolRow = {storage_key: string, symbol: string}

type KvCacheRow = {key: string, value: string}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function toNullableFiniteNumber(value: unknown): number | null {
  if (value == null) {
    return null
  }

  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export async function getStockQuotesCache(symbols: string[]): Promise<StockQuote[]> {
  if (symbols.length === 0) {
    return []
  }

  const db = getDb()
  const rows = await db<StockQuoteRow>("stock_quotes")
    .whereIn("symbol", symbols)
    .select("*")

  if (rows.length === 0) {
    return []
  }

  const quotes = rows.map((row) => {
    let dividends: DividendEvent[] = []
    if (typeof row.dividends === "string") {
      try {
        const parsed: unknown = JSON.parse(row.dividends)
        if (Array.isArray(parsed)) {
          dividends = parsed.map((event): DividendEvent => {
            const e = event as {amount?: unknown, date?: unknown}
            return {
              amount: toFiniteNumber(e.amount),
              date: toFiniteNumber(e.date),
            }
          })
        }
      }
      catch {
        dividends = []
      }
    }

    return {
      symbol: row.symbol,
      name: row.name,
      price: toFiniteNumber(row.price),
      previousClose: toFiniteNumber(row.previous_close),
      change: toFiniteNumber(row.change),
      changePercent: toFiniteNumber(row.change_percent),
      currency: row.currency,
      change1m: toNullableFiniteNumber(row.change_1m),
      change6m: toNullableFiniteNumber(row.change_6m),
      change1y: toNullableFiniteNumber(row.change_1y),
      change2y: toNullableFiniteNumber(row.change_2y),
      dividends,
    }
  })

  return JSON.parse(JSON.stringify(quotes)) as StockQuote[]
}

export async function saveStockQuotesCache(quotes: StockQuote[]): Promise<void> {
  const db = getDb()
  const now = Date.now()

  const rows = quotes.map(quote => ({
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    previous_close: quote.previousClose,
    change: quote.change,
    change_percent: quote.changePercent,
    currency: quote.currency,
    change_1m: quote.change1m,
    change_6m: quote.change6m,
    change_1y: quote.change1y,
    change_2y: quote.change2y,
    dividends: JSON.stringify(quote.dividends),
    updated_at: now,
  }))

  await db("stock_quotes")
    .insert(rows)
    .onConflict("symbol")
    .merge()
}

export async function clearStockQuotesCache(symbols: string[]): Promise<void> {
  if (symbols.length === 0) {
    return
  }

  const db = getDb()
  await db("stock_quotes")
    .whereIn("symbol", symbols)
    .delete()
}

export async function getStockAmounts(): Promise<Record<string, number>> {
  const db = getDb()
  const rows = await db<StockAmountRow>("stock_amounts").select("symbol", "amount")

  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row.symbol] = row.amount
  }

  return result
}

export async function setStockAmount(symbol: string, amount: number): Promise<void> {
  const db = getDb()

  if (amount === 0) {
    await db("stock_amounts").where("symbol", symbol).delete()
  }
  else {
    await db("stock_amounts")
      .insert({symbol, amount})
      .onConflict("symbol")
      .merge()
  }
}

export async function getScopedStockAmounts(scope: string): Promise<Record<string, number>> {
  const db = getDb()
  const scopedRows = await db<ScopedStockAmountRow>("stock_amounts_scoped")
    .where("scope", scope)
    .select("symbol", "amount")

  if (scopedRows.length > 0) {
    const scopedResult: Record<string, number> = {}
    for (const row of scopedRows) {
      scopedResult[row.symbol] = row.amount
    }
    return scopedResult
  }

  if (scope !== AMOUNT_SCOPE_STOCK_HOLDINGS) {
    return {}
  }

  const legacyRows = await db<StockAmountRow>("stock_amounts").select("symbol", "amount")
  if (legacyRows.length === 0) {
    return {}
  }

  await db("stock_amounts_scoped")
    .insert(legacyRows.map(row => ({
      scope,
      symbol: row.symbol,
      amount: row.amount,
    })))
    .onConflict(["scope", "symbol"])
    .merge()

  const migratedResult: Record<string, number> = {}
  for (const row of legacyRows) {
    migratedResult[row.symbol] = row.amount
  }

  return migratedResult
}

export async function setScopedStockAmount(scope: string, symbol: string, amount: number): Promise<void> {
  const db = getDb()

  if (amount === 0) {
    await db("stock_amounts_scoped")
      .where({scope, symbol})
      .delete()
  }
  else {
    await db("stock_amounts_scoped")
      .insert({scope, symbol, amount})
      .onConflict(["scope", "symbol"])
      .merge()
  }
}

export async function getScopedStockTargetWeights(scope: string): Promise<Record<string, number>> {
  const db = getDb()
  const rows = await db<ScopedStockTargetWeightRow>("stock_target_weights_scoped")
    .where("scope", scope)
    .select("symbol", "weight")

  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row.symbol] = row.weight
  }
  return result
}

export async function setScopedStockTargetWeight(scope: string, symbol: string, weight: number): Promise<void> {
  if (!Number.isInteger(weight) || weight < 1 || weight > 100) {
    throw new Error(`weight must be an integer between 1 and 100, got ${String(weight)}`)
  }

  const db = getDb()
  await db("stock_target_weights_scoped")
    .insert({scope, symbol, weight})
    .onConflict(["scope", "symbol"])
    .merge()
}

export async function getDisabledStockSymbols(storageKey: string): Promise<string[]> {
  const db = getDb()
  const rows = await db<DisabledSymbolRow>("stock_disabled_symbols")
    .where("storage_key", storageKey)
    .select("symbol")

  return rows.map(row => row.symbol)
}

export async function setDisabledStockSymbols(storageKey: string, symbols: string[]): Promise<void> {
  const db = getDb()
  const uniqueSymbols = Array.from(new Set(symbols))

  await db.transaction(async (trx) => {
    await trx("stock_disabled_symbols")
      .where("storage_key", storageKey)
      .delete()

    if (uniqueSymbols.length > 0) {
      await trx("stock_disabled_symbols").insert(
        uniqueSymbols.map(symbol => ({
          storage_key: storageKey,
          symbol,
        })),
      )
    }
  })
}

export async function getKvCache(key: string): Promise<unknown> {
  const db = getDb()
  const row = await db<KvCacheRow>("kv_cache").where("key", key).first()
  if (!row) {
    return null
  }

  try {
    return JSON.parse(row.value) as unknown
  }
  catch {
    return null
  }
}

export async function setKvCache(key: string, value: unknown): Promise<void> {
  const db = getDb()
  const serialized = JSON.stringify(value)

  await db("kv_cache")
    .insert({key, value: serialized})
    .onConflict("key")
    .merge()
}
