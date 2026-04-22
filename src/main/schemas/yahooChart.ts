import {z} from "zod"

/**
 * Zod schemas for Yahoo Finance `/v8/finance/chart/` API responses.
 *
 * Uses `z.looseObject()` on objects so that new fields Yahoo may add
 * don't cause validation failures — we only assert the fields we depend on.
 *
 * Note: `z.number()` in Zod v4 rejects NaN and Infinity by default,
 * so no extra `.finite()` check is needed.
 */

const YahooChartMetaSchema = z.looseObject({
  symbol: z.string(),
  currency: z.string(),
  regularMarketPrice: z.number().optional(),
  regularMarketTime: z.number().optional(),
  chartPreviousClose: z.number().optional(),
  longName: z.string().optional(),
  shortName: z.string().optional(),
})

const YahooChartQuoteSchema = z.looseObject({
  close: z.array(z.number().nullable()),
})

const YahooDividendEventSchema = z.looseObject({
  amount: z.number(),
  date: z.number(),
})

const YahooChartEventsSchema = z.looseObject({
  dividends: z.record(z.string(), YahooDividendEventSchema).optional(),
})

const YahooChartResultSchema = z.looseObject({
  meta: YahooChartMetaSchema,
  timestamp: z.array(z.number()).min(1),
  indicators: z.looseObject({
    quote: z.array(YahooChartQuoteSchema).min(1),
  }),
  events: YahooChartEventsSchema.optional(),
})

const YahooChartErrorSchema = z.looseObject({
  description: z.string().optional(),
})

export const YahooChartResponseSchema = z.looseObject({
  chart: z.looseObject({
    result: z.array(YahooChartResultSchema).min(1).nullable(),
    error: YahooChartErrorSchema.nullable().optional(),
  }),
})

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
