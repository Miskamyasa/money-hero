import type {z} from "zod/mini"

import {StockAmountsSchema, StockQuoteSchema, StockQuotesSchema} from "./schemas/stocks"

export type DividendEvent = z.infer<typeof StockQuoteSchema>["dividends"][number]

export type StockQuote = z.infer<typeof StockQuoteSchema>

export function parseStockQuote(value: unknown): StockQuote {
  return StockQuoteSchema.parse(value)
}

export function parseStockQuotes(value: unknown): StockQuote[] {
  return StockQuotesSchema.parse(value)
}

export function parseStockAmounts(value: unknown): Record<string, number> {
  return StockAmountsSchema.parse(value)
}
