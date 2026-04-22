import type {YahooChartResult} from "./schemas/yahooChart"

export type HistoricalChanges = {
  change1m: number | null,
  change6m: number | null,
  change2y: number | null,
}

const HISTORY_LOOKBACK_PADDING_DAYS = 14

type HistoryPoint = {
  timestamp: number,
  close: number,
}

function computeChangePercent(currentPrice: number, historicalPrice: number | undefined): number | null {
  if (historicalPrice == null || historicalPrice === 0 || !Number.isFinite(historicalPrice)) {
    return null
  }

  return ((currentPrice - historicalPrice) / historicalPrice) * 100
}

function normalizeHistoricalPrice(price: number | undefined, subunitDivisor: number): number | undefined {
  if (price == null || !Number.isFinite(price)) {
    return undefined
  }

  return price / subunitDivisor
}

export function getHistoricalWindowTimestamps(): {period1: number, period2: number} {
  const now = new Date()
  const period2 = Math.trunc(now.getTime() / 1000)
  const period1Date = new Date(now)

  period1Date.setUTCFullYear(period1Date.getUTCFullYear() - 2)
  period1Date.setUTCDate(period1Date.getUTCDate() - HISTORY_LOOKBACK_PADDING_DAYS)

  return {
    period1: Math.trunc(period1Date.getTime() / 1000),
    period2,
  }
}

function getUtcMonthLength(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function shiftReferenceTimestamp(
  timestamp: number,
  {months = 0, years = 0}: {months?: number, years?: number},
): number {
  const date = new Date(timestamp * 1000)
  const totalMonths = (date.getUTCFullYear() * 12) + date.getUTCMonth() - months - (years * 12)
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12
  const targetDay = Math.min(date.getUTCDate(), getUtcMonthLength(targetYear, targetMonth))

  return Math.trunc(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ) / 1000)
}

function findCloseOnOrBefore(points: HistoryPoint[], targetTimestamp: number): number | undefined {
  let matchedClose: number | undefined

  for (const point of points) {
    if (point.timestamp <= targetTimestamp) {
      matchedClose = point.close
      continue
    }

    break
  }

  return matchedClose
}

function isSameUtcDay(leftTimestamp: number, rightTimestamp: number): boolean {
  const left = new Date(leftTimestamp * 1000)
  const right = new Date(rightTimestamp * 1000)

  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate()
}

export function buildHistoryPoints(result: YahooChartResult, subunitDivisor = 1): HistoryPoint[] {
  const points: HistoryPoint[] = []
  const timestamps = result.timestamp
  const closePrices = result.indicators.quote[0].close
  const pointCount = Math.min(timestamps.length, closePrices.length)

  for (let index = 0; index < pointCount; index += 1) {
    const timestamp = timestamps[index]
    const close = closePrices[index]

    if (!Number.isFinite(timestamp) || close == null || !Number.isFinite(close)) {
      continue
    }

    points.push({
      timestamp,
      close: close / subunitDivisor,
    })
  }

  return points
}

export function inferPreviousCloseFromDailySeries(
  result: YahooChartResult,
  subunitDivisor = 1,
): number | null {
  const points = buildHistoryPoints(result, subunitDivisor)
  const totalPoints = points.length

  if (totalPoints === 0) {
    return normalizeHistoricalPrice(result.meta.chartPreviousClose, subunitDivisor) ?? null
  }

  const lastPoint = points[totalPoints - 1]
  const regularMarketTime = result.meta.regularMarketTime

  if (regularMarketTime != null && isSameUtcDay(regularMarketTime, lastPoint.timestamp)) {
    return totalPoints >= 2
      ? points[totalPoints - 2].close
      : normalizeHistoricalPrice(result.meta.chartPreviousClose, subunitDivisor) ?? null
  }

  return lastPoint.close
}

export function calculateHistoricalChanges(
  result: YahooChartResult,
  currentPrice: number,
  subunitDivisor = 1,
): HistoricalChanges {
  const points = buildHistoryPoints(result, subunitDivisor)
  const lastPoint = points.at(-1)
  const referenceTimestamp = result.meta.regularMarketTime ?? lastPoint?.timestamp
  const fallback2yPrice = normalizeHistoricalPrice(result.meta.chartPreviousClose, subunitDivisor)

  if (referenceTimestamp == null) {
    return {
      change1m: null,
      change6m: null,
      change2y: computeChangePercent(currentPrice, fallback2yPrice),
    }
  }

  const price1m = findCloseOnOrBefore(points, shiftReferenceTimestamp(referenceTimestamp, {months: 1}))
  const price6m = findCloseOnOrBefore(points, shiftReferenceTimestamp(referenceTimestamp, {months: 6}))
  const price2yAnchor = findCloseOnOrBefore(points, shiftReferenceTimestamp(referenceTimestamp, {years: 2}))
  const earliestVisiblePrice = points.length > 0 ? points[0].close : fallback2yPrice
  const price2y = price2yAnchor ?? earliestVisiblePrice

  return {
    change1m: computeChangePercent(currentPrice, price1m),
    change6m: computeChangePercent(currentPrice, price6m),
    change2y: computeChangePercent(currentPrice, price2y),
  }
}
