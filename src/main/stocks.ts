import {z} from "zod"

import type {DividendEvent, StockQuote} from "../shared/stocks"

import {formatYahooSchemaError, YahooChartResponseSchema} from "./schemas/yahooChart"

export const STOCK_IPC_CHANNEL = "stock:fetch-quote"

function normalizeYahooSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function computeChangePercent(currentPrice: number, historicalPrice: number | undefined): number | null {
  if (historicalPrice == null || historicalPrice === 0 || !Number.isFinite(historicalPrice)) {
    return null
  }
  return ((currentPrice - historicalPrice) / historicalPrice) * 100
}

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

type YahooSession = {
  cookie: string,
  crumb: string,
  expiresAt: number,
}

let cachedSession: YahooSession | null = null

function extractSetCookies(response: Response): string {
  const cookies: string[] = []
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      const name = value.split(";")[0]
      if (name) {
        cookies.push(name)
      }
    }
  })
  return cookies.join("; ")
}

export async function getYahooSession(): Promise<YahooSession> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return cachedSession
  }

  const consentResponse = await fetch("https://fc.yahoo.com/", {redirect: "manual"})
  const cookie = extractSetCookies(consentResponse)

  if (!cookie) {
    throw new Error("Failed to obtain Yahoo session cookie")
  }

  const crumbResponse = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {"Cookie": cookie, "User-Agent": "Mozilla/5.0"},
  })

  if (!crumbResponse.ok) {
    throw new Error(`Failed to fetch Yahoo crumb: ${crumbResponse.status} ${crumbResponse.statusText}`)
  }

  const crumb = await crumbResponse.text()

  if (!crumb || crumb === "null") {
    throw new Error("Yahoo Finance returned an invalid crumb")
  }

  cachedSession = {
    cookie,
    crumb,
    expiresAt: Date.now() + SESSION_TTL_MS,
  }

  return cachedSession
}

export function clearYahooSession(): void {
  cachedSession = null
}

function buildChartUrl(symbol: string, crumb: string): string {
  const params = `range=2y&interval=1mo&events=div&crumb=${encodeURIComponent(crumb)}`
  return `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?${params}`
}

function validateYahooResponse(data: unknown): z.infer<typeof YahooChartResponseSchema> {
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

function parseChartResponse(data: unknown): StockQuote {
  const parsed = validateYahooResponse(data)

  if (parsed.chart.error) {
    const description = parsed.chart.error.description ?? "Unknown error"
    throw new Error(`Yahoo Finance API error: ${description}`)
  }

  if (!parsed.chart.result) {
    throw new Error("Yahoo Finance API response missing chart results")
  }

  const result = parsed.chart.result[0]
  const {meta} = result

  const symbolResponse = meta.symbol
  let currency = meta.currency
  const name = meta.longName ?? meta.shortName ?? symbolResponse

  // Yahoo Finance reports London-listed stocks in GBp (pence sterling).
  // Normalize to GBP (pounds) by dividing all monetary values by 100.
  const isSubunit = currency === "GBp"
  const subunitDivisor = isSubunit ? 100 : 1
  if (isSubunit) {
    currency = "GBP"
  }

  const closePrices = result.indicators.quote[0].close
  const validCloses = closePrices
    .filter((p): p is number => p != null && Number.isFinite(p))
    .map(p => p / subunitDivisor)
  const totalPoints = validCloses.length

  let price = meta.regularMarketPrice != null ? meta.regularMarketPrice / subunitDivisor : null
  let previousClose = meta.chartPreviousClose != null ? meta.chartPreviousClose / subunitDivisor : null

  // Fallback: use the last valid close price if regularMarketPrice is missing
  if (price == null && totalPoints >= 1) {
    price = validCloses[totalPoints - 1]
  }

  // Fallback: use the first valid close price if chartPreviousClose is missing
  if (previousClose == null && totalPoints >= 1) {
    previousClose = validCloses[0]
  }

  if (price == null || previousClose == null) {
    throw new TypeError(`Yahoo Finance API response missing required price data for ${symbolResponse}`)
  }

  const change = price - previousClose
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0

  const price1m = totalPoints >= 2 ? validCloses[totalPoints - 2] : undefined
  const price6m = totalPoints >= 7 ? validCloses[totalPoints - 7] : undefined
  const price2y = totalPoints >= 1 ? validCloses[0] : undefined

  const dividendsRaw = result.events?.dividends

  const dividends: DividendEvent[] = dividendsRaw
    ? Object.values(dividendsRaw)
      .filter(d => Number.isFinite(d.amount) && Number.isFinite(d.date))
      .map(d => ({amount: d.amount / subunitDivisor, date: Math.trunc(d.date)}))
      .sort((a, b) => a.date - b.date)
    : []

  return {
    symbol: symbolResponse,
    name,
    price,
    previousClose,
    change,
    changePercent,
    currency,
    change1m: computeChangePercent(price, price1m),
    change6m: computeChangePercent(price, price6m),
    change2y: computeChangePercent(price, price2y),
    dividends,
  }
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const normalizedSymbol = normalizeYahooSymbol(symbol)
    const session = await getYahooSession()
    const url = buildChartUrl(normalizedSymbol, session.crumb)
    const response = await fetch(url, {
      headers: {"Cookie": session.cookie, "User-Agent": "Mozilla/5.0"},
    })

    if (response.status === 401 || response.status === 403) {
      clearYahooSession()
      const freshSession = await getYahooSession()
      const retryUrl = buildChartUrl(normalizedSymbol, freshSession.crumb)
      const retryResponse = await fetch(retryUrl, {
        headers: {"Cookie": freshSession.cookie, "User-Agent": "Mozilla/5.0"},
      })

      if (!retryResponse.ok) {
        throw new Error(`Yahoo Finance API returned status ${retryResponse.status}: ${retryResponse.statusText}`)
      }

      return parseChartResponse(await retryResponse.json())
    }

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}: ${response.statusText}`)
    }

    return parseChartResponse(await response.json())
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch stock quote: ${error.message}`, {cause: error})
    }
    throw new Error("Failed to fetch stock quote: Unknown error occurred", {cause: error})
  }
}
