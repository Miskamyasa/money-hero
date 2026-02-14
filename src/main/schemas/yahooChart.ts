import { z } from "zod"

/**
 * Zod schemas for Yahoo Finance `/v8/finance/chart/` API responses.
 *
 * Uses `.passthrough()` on objects so that new fields Yahoo may add
 * don't cause validation failures — we only assert the fields we depend on.
 *
 * Note: `z.number()` in Zod v4 rejects NaN and Infinity by default,
 * so no extra `.finite()` check is needed.
 */

const YahooChartMetaSchema = z.object({
  symbol: z.string(),
  currency: z.string(),
  regularMarketPrice: z.number().optional(),
  chartPreviousClose: z.number().optional(),
  longName: z.string().optional(),
  shortName: z.string().optional(),
}).passthrough()

const YahooChartQuoteSchema = z.object({
  close: z.array(z.number().nullable()),
}).passthrough()

const YahooDividendEventSchema = z.object({
  amount: z.number(),
  date: z.number(),
}).passthrough()

const YahooChartEventsSchema = z.object({
  dividends: z.record(z.string(), YahooDividendEventSchema).optional(),
}).passthrough()

const YahooChartResultSchema = z.object({
  meta: YahooChartMetaSchema,
  indicators: z.object({
    quote: z.array(YahooChartQuoteSchema).min(1),
  }).passthrough(),
  events: YahooChartEventsSchema.optional(),
}).passthrough()

const YahooChartErrorSchema = z.object({
  description: z.string().optional(),
}).passthrough()

export const YahooChartResponseSchema = z.object({
  chart: z.object({
    result: z.array(YahooChartResultSchema).min(1).nullable(),
    error: YahooChartErrorSchema.nullable().optional(),
  }).passthrough(),
}).passthrough()

export type YahooChartResponse = z.infer<typeof YahooChartResponseSchema>
export type YahooChartResult = z.infer<typeof YahooChartResultSchema>
export type YahooChartMeta = z.infer<typeof YahooChartMetaSchema>
export type YahooDividendEvent = z.infer<typeof YahooDividendEventSchema>

/**
 * Formats a ZodError into a concise, user-facing message indicating
 * that the Yahoo Finance API response structure has changed.
 */
export function formatYahooSchemaError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".")
    return path ? `${path}: ${issue.message}` : issue.message
  })
  return `Yahoo Finance API response schema changed: ${issues.join("; ")}`
}
