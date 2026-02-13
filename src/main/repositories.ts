import type { DividendEvent, StockQuote } from "../shared/stocks"

import { getDb } from "./database"

const CACHE_TTL = 60 * 60 * 1000

function toFiniteNumber(value: unknown, fallback: number = 0): number {
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
  const rows = await db("stock_quotes")
    .whereIn("symbol", symbols)
    .select("*")

  if (rows.length === 0) {
    return []
  }

  const now = Date.now()
  const mostRecentUpdatedAt = Math.max(...rows.map(row => row.updated_at as number))

  if (now - mostRecentUpdatedAt > CACHE_TTL) {
    return []
  }

  const quotes = rows.map((row) => {
    let dividends: DividendEvent[] = []
    if (typeof row.dividends === "string") {
      try {
        const parsed = JSON.parse(row.dividends) as unknown
        if (Array.isArray(parsed)) {
          dividends = parsed.map((event): DividendEvent => ({
            amount: toFiniteNumber((event as Partial<DividendEvent>).amount),
            date: toFiniteNumber((event as Partial<DividendEvent>).date),
          }))
        }
      }
      catch {
        dividends = []
      }
    }

    return {
      symbol: row.symbol as string,
      name: row.name as string,
      price: toFiniteNumber(row.price),
      previousClose: toFiniteNumber(row.previous_close),
      change: toFiniteNumber(row.change),
      changePercent: toFiniteNumber(row.change_percent),
      currency: row.currency as string,
      change1m: toNullableFiniteNumber(row.change_1m),
      change6m: toNullableFiniteNumber(row.change_6m),
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
    change_2y: quote.change2y,
    dividends: JSON.stringify(quote.dividends ?? []),
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
  const rows = await db("stock_amounts").select("symbol", "amount")

  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row.symbol as string] = row.amount as number
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
      .insert({ symbol, amount })
      .onConflict("symbol")
      .merge()
  }
}
