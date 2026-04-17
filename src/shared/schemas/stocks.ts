/**
 * Zod Mini schemas for domain types that cross the IPC bridge.
 *
 * Uses `zod/mini` instead of `zod` because the preload script runs in
 * Electron's context-isolated environment where `new Function()` is blocked.
 * Zod Mini avoids JIT compilation entirely, making it safe for this context.
 *
 * Note: `z.number()` in Zod v4 rejects NaN and Infinity by default,
 * so no extra `.finite()` check is needed.
 */
import {z} from "zod/mini"

export const DividendEventSchema = z.object({
  amount: z.number(),
  date: z.number(),
})

export const StockQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  previousClose: z.number(),
  change: z.number(),
  changePercent: z.number(),
  currency: z.string(),
  change1m: z.nullable(z.number()),
  change6m: z.nullable(z.number()),
  change2y: z.nullable(z.number()),
  dividends: z.array(DividendEventSchema),
})

export const StockQuotesSchema = z.array(StockQuoteSchema)

export const StockAmountsSchema = z.record(z.string(), z.number())
