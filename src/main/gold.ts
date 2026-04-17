import {z} from "zod"

import type {YahooChartResponse} from "./schemas/yahooChart"
import {formatYahooSchemaError, YahooChartResponseSchema} from "./schemas/yahooChart"

export type GoldQuote = {
  price: number,
  previousClose: number,
  change: number,
  changePercent: number,
  currency: string,
  symbol: string,
}

export const GOLD_IPC_CHANNEL = "gold:fetch-quote"

const GOLD_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=1d&interval=1d"

function validateYahooResponse(data: unknown): YahooChartResponse {
  try {
    return YahooChartResponseSchema.parse(data)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(formatYahooSchemaError(error), {cause: error})
    }
    throw error
  }
}

export async function fetchGoldQuote(): Promise<GoldQuote> {
  try {
    const response = await fetch(GOLD_CHART_URL)

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}: ${response.statusText}`)
    }

    const parsed = validateYahooResponse(await response.json())

    if (!parsed.chart.result) {
      throw new Error("Yahoo Finance API response missing chart results")
    }

    const {meta} = parsed.chart.result[0]

    const price = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose

    if (price == null || previousClose == null) {
      throw new TypeError(
        "Yahoo Finance API response missing required numeric fields (regularMarketPrice or chartPreviousClose)",
      )
    }

    const change = price - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      price,
      previousClose,
      change,
      changePercent,
      currency: meta.currency,
      symbol: meta.symbol,
    }
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch gold quote: ${error.message}`, {cause: error})
    }
    throw new Error("Failed to fetch gold quote: Unknown error occurred", {cause: error})
  }
}
