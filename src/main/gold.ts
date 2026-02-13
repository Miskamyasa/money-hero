export interface GoldQuote {
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  symbol: string
}

export const GOLD_IPC_CHANNEL = "gold:fetch-quote"

const GOLD_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=1d&interval=1d"

export async function fetchGoldQuote(): Promise<GoldQuote> {
  try {
    const response = await fetch(GOLD_CHART_URL)

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.chart?.result?.[0]?.meta) {
      throw new Error("Yahoo Finance API response missing expected chart.result[0].meta structure")
    }

    const meta = data.chart.result[0].meta

    const price = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose
    const currency = meta.currency
    const symbol = meta.symbol

    if (typeof price !== "number" || typeof previousClose !== "number") {
      throw new TypeError("Yahoo Finance API response missing required numeric fields (regularMarketPrice or chartPreviousClose)")
    }

    if (typeof currency !== "string" || typeof symbol !== "string") {
      throw new TypeError("Yahoo Finance API response missing required string fields (currency or symbol)")
    }

    const change = price - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      price,
      previousClose,
      change,
      changePercent,
      currency,
      symbol,
    }
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch gold quote: ${error.message}`)
    }
    throw new Error("Failed to fetch gold quote: Unknown error occurred")
  }
}
