import {z} from "zod"

import type {DividendEvent, StockQuote} from "../shared/stocks"

import {formatYahooSchemaError, YahooChartResponseSchema} from "./schemas/yahooChart"
import {
  buildHistoryPoints,
  calculateHistoricalChanges,
  getHistoricalWindowTimestamps,
  inferPreviousCloseFromDailySeries,
} from "./yahooHistory"

export const STOCK_IPC_CHANNEL = "stock:fetch-quote"

function normalizeYahooSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
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
  const {period1, period2} = getHistoricalWindowTimestamps()
  const params = `period1=${period1}&period2=${period2}&interval=1d&events=div&crumb=${encodeURIComponent(crumb)}`
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

  // Yahoo Finance reports some tickers in subunit currencies:
  //   - London-listed stocks in GBp (pence sterling, 1/100 GBP)
  //   - Tel Aviv-listed stocks in ILA (agurot, 1/100 ILS)
  // Normalize to the parent currency by dividing all monetary values by 100.
  const subunitCurrencies: Partial<Record<string, string>> = {GBp: "GBP", ILA: "ILS"}
  const parentCurrency = subunitCurrencies[currency]
  const subunitDivisor = parentCurrency ? 100 : 1
  if (parentCurrency) {
    currency = parentCurrency
  }

  const historyPoints = buildHistoryPoints(result, subunitDivisor)
  const totalPoints = historyPoints.length

  let price = meta.regularMarketPrice != null ? meta.regularMarketPrice / subunitDivisor : null
  const previousClose = inferPreviousCloseFromDailySeries(result, subunitDivisor)

  // Fallback: use the last valid close price if regularMarketPrice is missing
  if (price == null && totalPoints >= 1) {
    price = historyPoints[totalPoints - 1].close
  }

  if (price == null || previousClose == null) {
    throw new TypeError(`Yahoo Finance API response missing required price data for ${symbolResponse}`)
  }

  const change = price - previousClose
  const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0
  const historicalChanges = calculateHistoricalChanges(result, price, subunitDivisor)

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
    change1m: historicalChanges.change1m,
    change6m: historicalChanges.change6m,
    change1y: historicalChanges.change1y,
    change2y: historicalChanges.change2y,
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
