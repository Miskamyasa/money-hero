export interface GoldQuote {
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  symbol: string
}

export interface GoldHistory {
  change1m: number | null
  change6m: number | null
  change2y: number | null
}

export const GOLD_IPC_CHANNEL = "gold:fetch-quote"
export const GOLD_HISTORY_IPC_CHANNEL = "gold:fetch-history"

const GOLD_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=1d&interval=1d"
const GOLD_HISTORY_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=2y&interval=1mo"

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

function computeChangePercent(currentPrice: number, historicalPrice: number | undefined): number | null {
  if (historicalPrice == null || historicalPrice === 0 || !Number.isFinite(historicalPrice)) {
    return null
  }
  return ((currentPrice - historicalPrice) / historicalPrice) * 100
}

export async function fetchGoldHistory(): Promise<GoldHistory> {
  try {
    const response = await fetch(GOLD_HISTORY_URL)

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.chart?.result?.[0]?.meta) {
      throw new Error("Yahoo Finance API response missing expected chart.result[0].meta structure")
    }

    const meta = data.chart.result[0].meta
    const closePrices: (number | null)[] = data.chart.result[0]?.indicators?.quote?.[0]?.close ?? []

    const currentPrice = meta.regularMarketPrice
    if (typeof currentPrice !== "number") {
      throw new TypeError("Yahoo Finance API response missing required numeric field (regularMarketPrice)")
    }

    // Filter out null values and get valid closing prices
    const validCloses = closePrices.filter((p): p is number => p != null && Number.isFinite(p))
    const totalPoints = validCloses.length

    // 1 month ago = second-to-last monthly close
    const price1m = totalPoints >= 2 ? validCloses[totalPoints - 2] : undefined
    // 6 months ago = 7th from end
    const price6m = totalPoints >= 7 ? validCloses[totalPoints - 7] : undefined
    // 2 years ago = first data point
    const price2y = totalPoints >= 1 ? validCloses[0] : undefined

    return {
      change1m: computeChangePercent(currentPrice, price1m),
      change6m: computeChangePercent(currentPrice, price6m),
      change2y: computeChangePercent(currentPrice, price2y),
    }
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch gold history: ${error.message}`)
    }
    throw new Error("Failed to fetch gold history: Unknown error occurred")
  }
}
