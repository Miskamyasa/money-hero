import type { DividendEvent, StockQuote } from "./stocks"

import { getDb } from "./database"

const CACHE_TTL = 60 * 60 * 1000

export async function getStockQuotesCache(): Promise<StockQuote[]> {
  const db = getDb()
  const rows = await db("stock_quotes").select("*")

  if (rows.length === 0) {
    return []
  }

  const now = Date.now()
  const mostRecentUpdatedAt = Math.max(...rows.map(row => row.updated_at as number))

  if (now - mostRecentUpdatedAt > CACHE_TTL) {
    return []
  }

  return rows.map((row) => {
    let dividends: DividendEvent[] = []
    if (typeof row.dividends === "string") {
      try {
        dividends = JSON.parse(row.dividends) as DividendEvent[]
      }
      catch {
        dividends = []
      }
    }

    return {
      symbol: row.symbol as string,
      name: row.name as string,
      price: row.price as number,
      previousClose: row.previous_close as number,
      change: row.change as number,
      changePercent: row.change_percent as number,
      currency: row.currency as string,
      change1m: row.change_1m as number | null,
      change6m: row.change_6m as number | null,
      change2y: row.change_2y as number | null,
      dividends,
    }
  })
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

export async function clearStockQuotesCache(): Promise<void> {
  const db = getDb()
  await db("stock_quotes").delete()
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
