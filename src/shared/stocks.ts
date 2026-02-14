export type UnixTimestampSeconds = number

export interface DividendEvent {
  amount: number
  date: UnixTimestampSeconds
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

function assertObject(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${path} must be a string`)
  }
}

function assertFiniteNumber(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number`)
  }
}

function assertNullableFiniteNumber(value: unknown, path: string): asserts value is number | null {
  if (value !== null) {
    assertFiniteNumber(value, path)
  }
}

function parseDividendEvent(value: unknown, path: string): DividendEvent {
  assertObject(value, path)
  assertFiniteNumber(value.amount, `${path}.amount`)
  assertFiniteNumber(value.date, `${path}.date`)

  return {
    amount: value.amount,
    date: value.date,
  }
}

function parseStockQuoteAtPath(value: unknown, path: string): StockQuote {
  assertObject(value, path)
  assertString(value.symbol, `${path}.symbol`)
  assertString(value.name, `${path}.name`)
  assertFiniteNumber(value.price, `${path}.price`)
  assertFiniteNumber(value.previousClose, `${path}.previousClose`)
  assertFiniteNumber(value.change, `${path}.change`)
  assertFiniteNumber(value.changePercent, `${path}.changePercent`)
  assertString(value.currency, `${path}.currency`)
  assertNullableFiniteNumber(value.change1m, `${path}.change1m`)
  assertNullableFiniteNumber(value.change6m, `${path}.change6m`)
  assertNullableFiniteNumber(value.change2y, `${path}.change2y`)

  if (!Array.isArray(value.dividends)) {
    throw new TypeError(`${path}.dividends must be an array`)
  }

  return {
    symbol: value.symbol,
    name: value.name,
    price: value.price,
    previousClose: value.previousClose,
    change: value.change,
    changePercent: value.changePercent,
    currency: value.currency,
    change1m: value.change1m,
    change6m: value.change6m,
    change2y: value.change2y,
    dividends: value.dividends.map((event, index) => parseDividendEvent(event, `${path}.dividends[${index}]`)),
  }
}

export function parseStockQuote(value: unknown): StockQuote {
  return parseStockQuoteAtPath(value, "stockQuote")
}

export function parseStockQuotes(value: unknown): StockQuote[] {
  if (!Array.isArray(value)) {
    throw new TypeError("stockQuotes must be an array")
  }

  return value.map((quote, index) => parseStockQuoteAtPath(quote, `stockQuotes[${index}]`))
}

export function parseStockAmounts(value: unknown): Record<string, number> {
  assertObject(value, "stockAmounts")

  const parsed: Record<string, number> = {}
  for (const [symbol, amount] of Object.entries(value)) {
    assertFiniteNumber(amount, `stockAmounts.${symbol}`)
    parsed[symbol] = amount
  }

  return parsed
}
