export interface DividendEvent {
  amount: number
  date: number // Unix timestamp in seconds
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  change1m: number | null
  change6m: number | null
  change2y: number | null
  dividends: DividendEvent[]
}

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

interface YahooSession {
  cookie: string
  crumb: string
  expiresAt: number
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

  const consentResponse = await fetch("https://fc.yahoo.com/", { redirect: "manual" })
  const cookie = extractSetCookies(consentResponse)

  if (!cookie) {
    throw new Error("Failed to obtain Yahoo session cookie")
  }

  const crumbResponse = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "Cookie": cookie, "User-Agent": "Mozilla/5.0" },
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

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const normalizedSymbol = normalizeYahooSymbol(symbol)
    const session = await getYahooSession()
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?range=2y&interval=1mo&events=div&crumb=${encodeURIComponent(session.crumb)}`
    const response = await fetch(url, {
      headers: { "Cookie": session.cookie, "User-Agent": "Mozilla/5.0" },
    })

    if (response.status === 401 || response.status === 403) {
      clearYahooSession()
      const freshSession = await getYahooSession()
      const retryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?range=2y&interval=1mo&events=div&crumb=${encodeURIComponent(freshSession.crumb)}`
      const retryResponse = await fetch(retryUrl, {
        headers: { "Cookie": freshSession.cookie, "User-Agent": "Mozilla/5.0" },
      })

      if (!retryResponse.ok) {
        throw new Error(`Yahoo Finance API returned status ${retryResponse.status}: ${retryResponse.statusText}`)
      }

      return parseChartResponse(await retryResponse.json(), normalizedSymbol)
    }

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}: ${response.statusText}`)
    }

    return parseChartResponse(await response.json(), normalizedSymbol)
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch stock quote: ${error.message}`)
    }
    throw new Error("Failed to fetch stock quote: Unknown error occurred")
  }
}

function parseChartResponse(data: unknown, requestedSymbol: string): StockQuote {
  const chart = (data as Record<string, unknown>)?.chart as Record<string, unknown> | undefined
  const error = chart?.error as Record<string, unknown> | undefined

  if (error) {
    const description = typeof error.description === "string" ? error.description : "Unknown error"
    throw new Error(`Yahoo Finance API error: ${description}`)
  }

  const results = chart?.result as Array<Record<string, unknown>> | undefined

  if (!results?.[0]?.meta) {
    throw new Error("Yahoo Finance API response missing expected chart.result[0].meta structure")
  }

  const meta = results[0].meta as Record<string, unknown>
  const symbolResponse = typeof meta.symbol === "string" ? meta.symbol : requestedSymbol
  const currency = meta.currency

  if (typeof currency !== "string") {
    throw new TypeError("Yahoo Finance API response missing required string field (currency)")
  }

  const name = typeof meta.longName === "string" ? meta.longName : (typeof meta.shortName === "string" ? meta.shortName : symbolResponse)

  const indicators = results[0]?.indicators as Record<string, unknown> | undefined
  const quote = (indicators?.quote as Array<Record<string, unknown>> | undefined)?.[0]
  const closePrices: (number | null)[] = (quote?.close as (number | null)[] | undefined) ?? []
  const validCloses = closePrices.filter((p): p is number => p != null && Number.isFinite(p))
  const totalPoints = validCloses.length

  let price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null
  let previousClose = typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : null

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

  const events = results[0]?.events as Record<string, unknown> | undefined
  const dividendsRaw = events?.dividends as Record<string, { amount: number, date: number }> | undefined

  const dividends: DividendEvent[] = dividendsRaw
    ? Object.values(dividendsRaw)
        .filter(d => typeof d.amount === "number" && typeof d.date === "number")
        .map(d => ({ amount: d.amount, date: d.date }))
        .sort((a, b) => a.date - b.date)
    : []

  return {
    symbol: symbolResponse,
    name: name as string,
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
