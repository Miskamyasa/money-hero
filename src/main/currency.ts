import {z} from "zod"

import type {YahooChartResponse} from "./schemas/yahooChart"
import {formatYahooSchemaError, YahooChartResponseSchema} from "./schemas/yahooChart"

export type CurrencyRate = {
  symbol: string,
  label: string,
  rate: number,
  changePercent: number,
  hidden: boolean,
}

export type DollarIndex = {
  value: number,
  changePercent: number,
}

export type CurrencyRates = {
  dollar: DollarIndex,
  currencies: CurrencyRate[],
}

export const CURRENCY_IPC_CHANNEL = "currency:fetch-rates"

// Yahoo Finance forex symbols: USDGBP=X means 1 USD in GBP
const FOREX_PAIRS = [
  {symbol: "GBPUSD=X", label: "GBP", invert: true, hidden: false},
  {symbol: "EURUSD=X", label: "EUR", invert: true, hidden: false},
  {symbol: "ILSUSD=X", label: "ILS", invert: true, hidden: false},
  {symbol: "INRUSD=X", label: "INR", invert: true, hidden: true},
  {symbol: "BRLUSD=X", label: "BRL", invert: true, hidden: true},
]

const DXY_SYMBOL = "DX-Y.NYB"
const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart"

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

async function fetchForexRate(pair: typeof FOREX_PAIRS[number]): Promise<CurrencyRate> {
  const url = `${CHART_URL}/${pair.symbol}?range=2d&interval=1d`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned status ${response.status} for ${pair.symbol}`)
  }

  const parsed = validateYahooResponse(await response.json())

  if (!parsed.chart.result) {
    throw new Error(`Yahoo Finance API response missing chart results for ${pair.symbol}`)
  }

  const {meta} = parsed.chart.result[0]
  const price = meta.regularMarketPrice
  const previousClose = meta.chartPreviousClose

  if (price == null || previousClose == null) {
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
    hidden: pair.hidden,
  }
}

async function fetchDollarIndex(): Promise<DollarIndex> {
  const url = `${CHART_URL}/${DXY_SYMBOL}?range=1d&interval=1d`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned status ${response.status} for DXY`)
  }

  const parsed = validateYahooResponse(await response.json())

  if (!parsed.chart.result) {
    throw new Error("Yahoo Finance API response missing chart results for DXY")
  }

  const {meta} = parsed.chart.result[0]
  const value = meta.regularMarketPrice
  const previousClose = meta.chartPreviousClose

  if (value == null || previousClose == null) {
    throw new TypeError("Missing numeric fields for DXY")
  }

  const changePercent = ((value - previousClose) / previousClose) * 100

  return {value, changePercent}
}

export async function fetchCurrencyRates(): Promise<CurrencyRates> {
  try {
    const [dollar, ...currencies] = await Promise.all([
      fetchDollarIndex(),
      ...FOREX_PAIRS.map(pair => fetchForexRate(pair)),
    ])

    return {dollar, currencies}
  }
  catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch currency rates: ${error.message}`, {cause: error})
    }
    throw new Error("Failed to fetch currency rates: Unknown error occurred", {cause: error})
  }
}
