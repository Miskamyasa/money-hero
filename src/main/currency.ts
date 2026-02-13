export interface CurrencyRate {
  symbol: string
  label: string
  rate: number
  changePercent: number
}

export interface DollarIndex {
  value: number
  changePercent: number
}

export interface CurrencyRates {
  dollar: DollarIndex
  currencies: CurrencyRate[]
}

export const CURRENCY_IPC_CHANNEL = "currency:fetch-rates"

// Yahoo Finance forex symbols: USDGBP=X means 1 USD in GBP
const FOREX_PAIRS = [
  { symbol: "GBPUSD=X", label: "GBP", invert: true },
  { symbol: "EURUSD=X", label: "EUR", invert: true },
  { symbol: "ILSUSD=X", label: "ILS", invert: true },
]

const DXY_SYMBOL = "DX-Y.NYB"
const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

async function fetchForexRate(pair: typeof FOREX_PAIRS[number]): Promise<CurrencyRate> {
  const url = `${CHART_URL}/${pair.symbol}?range=2d&interval=1d`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned status ${response.status} for ${pair.symbol}`)
  }

  const data = await response.json()

  if (!data.chart?.result?.[0]?.meta) {
    throw new Error(`Yahoo Finance API response missing expected structure for ${pair.symbol}`)
  }

  const meta = data.chart.result[0].meta
  const price = meta.regularMarketPrice
  const previousClose = meta.chartPreviousClose

  if (typeof price !== "number" || typeof previousClose !== "number") {
    throw new TypeError(`Missing numeric fields for ${pair.symbol}`)
  }

  // Yahoo gives us XXX/USD (e.g. GBP/USD = 1.27 means 1 GBP = 1.27 USD)
  // We need USD/XXX (how many XXX per 1 USD), so we invert
  const rate = pair.invert ? 1 / price : price
  const prevRate = pair.invert ? 1 / previousClose : previousClose

  // Daily change percent of the rate from USD perspective
  const changePercent = ((rate - prevRate) / prevRate) * 100

  return {
    symbol: pair.symbol,
    label: pair.label,
    rate,
    changePercent,
  }
}

async function fetchDollarIndex(): Promise<DollarIndex> {
  const url = `${CHART_URL}/${DXY_SYMBOL}?range=1d&interval=1d`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned status ${response.status} for DXY`)
  }

  const data = await response.json()

  if (!data.chart?.result?.[0]?.meta) {
    throw new Error("Yahoo Finance API response missing expected structure for DXY")
  }

  const meta = data.chart.result[0].meta
  const value = meta.regularMarketPrice
  const previousClose = meta.chartPreviousClose

  if (typeof value !== "number" || typeof previousClose !== "number") {
    throw new TypeError("Missing numeric fields for DXY")
  }

  const changePercent = ((value - previousClose) / previousClose) * 100

  return { value, changePercent }
}

export async function fetchCurrencyRates(): Promise<CurrencyRates> {
  try {
    const [dollar, ...currencies] = await Promise.all([
      fetchDollarIndex(),
      ...FOREX_PAIRS.map(pair => fetchForexRate(pair)),
    ])

    return { dollar, currencies }
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch currency rates: ${error.message}`)
    }
    throw new Error("Failed to fetch currency rates: Unknown error occurred")
  }
}
