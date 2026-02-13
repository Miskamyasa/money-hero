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
}

export const STOCK_IPC_CHANNEL = "stock:fetch-quote"

export const DIVIDEND_ARISTOCRATS = ["ABBV", "ABT", "ADM", "ADP", "AFL", "ALB", "AMCR", "AOS", "APD", "ATO", "BDX", "BEN", "BF.B", "BRO", "CAH", "CAT", "CB", "CHD", "CINF", "CL", "CLX", "CTAS", "CVX", "DOV", "ECL", "ED", "EMR", "ESS", "EXPD", "FRT", "GD", "GPC", "GWW", "HRL", "IBM", "ITW", "JNJ", "KMB", "KO", "LIN", "LOW", "MCD", "MDT", "MKC", "MMM", "NEE", "NUE", "O", "PBCT", "PEP", "PG", "PNR", "PPG", "ROP", "SHW", "SPGI", "SWK", "SYY", "TGT", "TROW", "VFC", "WBA", "WMT", "WST", "XOM", "DHR", "XYL", "AWK", "WTRG", "SJW", "YORW"]

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
    headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0" },
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
    const session = await getYahooSession()
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2y&interval=1mo&crumb=${encodeURIComponent(session.crumb)}`
    const response = await fetch(url, {
      headers: { Cookie: session.cookie, "User-Agent": "Mozilla/5.0" },
    })

    if (response.status === 401 || response.status === 403) {
      clearYahooSession()
      const freshSession = await getYahooSession()
      const retryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2y&interval=1mo&crumb=${encodeURIComponent(freshSession.crumb)}`
      const retryResponse = await fetch(retryUrl, {
        headers: { Cookie: freshSession.cookie, "User-Agent": "Mozilla/5.0" },
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
      throw new Error(`Failed to fetch stock quote: ${error.message}`)
    }
    throw new Error("Failed to fetch stock quote: Unknown error occurred")
  }
}

function parseChartResponse(data: unknown): StockQuote {
  const chart = (data as Record<string, unknown>)?.chart as Record<string, unknown> | undefined
  const results = chart?.result as Array<Record<string, unknown>> | undefined

  if (!results?.[0]?.meta) {
    throw new Error("Yahoo Finance API response missing expected chart.result[0].meta structure")
  }

  const meta = results[0].meta as Record<string, unknown>

  const price = meta.regularMarketPrice
  const previousClose = meta.chartPreviousClose
  const currency = meta.currency
  const symbolResponse = meta.symbol
  const name = typeof meta.longName === "string" ? meta.longName : (typeof meta.shortName === "string" ? meta.shortName : symbolResponse)

  if (typeof price !== "number" || typeof previousClose !== "number") {
    throw new TypeError("Yahoo Finance API response missing required numeric fields (regularMarketPrice or chartPreviousClose)")
  }

  if (typeof currency !== "string" || typeof symbolResponse !== "string") {
    throw new TypeError("Yahoo Finance API response missing required string fields (currency or symbol)")
  }

  const change = price - previousClose
  const changePercent = (change / previousClose) * 100

  const indicators = results[0]?.indicators as Record<string, unknown> | undefined
  const quote = (indicators?.quote as Array<Record<string, unknown>> | undefined)?.[0]
  const closePrices: (number | null)[] = (quote?.close as (number | null)[] | undefined) ?? []
  const validCloses = closePrices.filter((p): p is number => p != null && Number.isFinite(p))
  const totalPoints = validCloses.length

  const price1m = totalPoints >= 2 ? validCloses[totalPoints - 2] : undefined
  const price6m = totalPoints >= 7 ? validCloses[totalPoints - 7] : undefined
  const price2y = totalPoints >= 1 ? validCloses[0] : undefined

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
  }
}
