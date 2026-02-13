import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearYahooSession, DIVIDEND_ARISTOCRATS, fetchStockQuote, getYahooSession, STOCK_IPC_CHANNEL } from "./stocks"

function makeChartResponse(overrides?: {
  meta?: Record<string, unknown>
  closePrices?: (number | null)[]
  dividends?: Record<string, { amount: number, date: number }>
}): object {
  return {
    chart: {
      result: [{
        meta: {
          currency: "USD",
          symbol: "ABBV",
          longName: "AbbVie Inc.",
          regularMarketPrice: 175.50,
          chartPreviousClose: 173.25,
          ...overrides?.meta,
        },
        ...(overrides?.closePrices !== undefined
          ? { indicators: { quote: [{ close: overrides.closePrices }] } }
          : {}),
        ...(overrides?.dividends !== undefined
          ? { events: { dividends: overrides.dividends } }
          : {}),
      }],
      error: null,
    },
  }
}

function mockSessionHandshake(mockFetch: ReturnType<typeof vi.fn>): void {
  // First call: fc.yahoo.com for cookie
  mockFetch.mockResolvedValueOnce({
    ok: true,
    headers: new Headers([["set-cookie", "A3=d=abc123; Expires=Fri"]]),
  })
  // Second call: getcrumb
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => "test-crumb-value",
  })
}

describe("getYahooSession", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    clearYahooSession()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should obtain a cookie and crumb", async () => {
    mockSessionHandshake(mockFetch)

    const session = await getYahooSession()

    expect(session.cookie).toBe("A3=d=abc123")
    expect(session.crumb).toBe("test-crumb-value")
    expect(session.expiresAt).toBeGreaterThan(Date.now())
    expect(mockFetch).toHaveBeenCalledWith("https://fc.yahoo.com/", { redirect: "manual" })
    expect(mockFetch).toHaveBeenCalledWith("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "Cookie": "A3=d=abc123", "User-Agent": "Mozilla/5.0" },
    })
  })

  it("should return cached session on subsequent calls", async () => {
    mockSessionHandshake(mockFetch)

    const session1 = await getYahooSession()
    const session2 = await getYahooSession()

    expect(session1).toBe(session2)
    expect(mockFetch).toHaveBeenCalledTimes(2) // only the initial handshake
  })

  it("should throw when no cookie is returned", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    })

    await expect(getYahooSession()).rejects.toThrow("Failed to obtain Yahoo session cookie")
  })

  it("should throw when crumb request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers([["set-cookie", "A3=d=abc123; Expires=Fri"]]),
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })

    await expect(getYahooSession()).rejects.toThrow("Failed to fetch Yahoo crumb: 500 Internal Server Error")
  })

  it("should throw when crumb is invalid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers([["set-cookie", "A3=d=abc123; Expires=Fri"]]),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "null",
    })

    await expect(getYahooSession()).rejects.toThrow("Yahoo Finance returned an invalid crumb")
  })
})

describe("fetchStockQuote", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    clearYahooSession()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return a valid StockQuote with history on successful fetch", async () => {
    const closePrices = [
      140,
      142,
      144,
      146,
      148,
      150,
      152,
      154,
      156,
      158,
      160,
      162,
      164,
      166,
      168,
      170,
      171,
      172,
      173,
      174,
      174.50,
      174.75,
      175.00,
      175.25,
    ]

    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse({ closePrices }),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.symbol).toBe("ABBV")
    expect(result.name).toBe("AbbVie Inc.")
    expect(result.price).toBe(175.50)
    expect(result.previousClose).toBe(173.25)
    expect(result.change).toBeCloseTo(2.25)
    expect(result.changePercent).toBeCloseTo(1.2987, 2)
    expect(result.currency).toBe("USD")
    // 1m: second-to-last = index 22 = 175.00
    expect(result.change1m).toBeCloseTo(((175.50 - 175.00) / 175.00) * 100, 2)
    // 6m: 7th from end = index 17 = 172
    expect(result.change6m).toBeCloseTo(((175.50 - 172) / 172) * 100, 2)
    // 2y: first = index 0 = 140
    expect(result.change2y).toBeCloseTo(((175.50 - 140) / 140) * 100, 2)
  })

  it("should include crumb and events=div in the chart URL", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse(),
    })

    await fetchStockQuote("ABBV")

    // Third call is the chart request (after cookie + crumb)
    const chartCall = mockFetch.mock.calls[2]
    expect(chartCall[0]).toContain("crumb=test-crumb-value")
    expect(chartCall[0]).toContain("events=div")
    expect(chartCall[0]).toContain("ABBV")
    expect(chartCall[1].headers.Cookie).toBe("A3=d=abc123")
  })

  it("should fall back to shortName when longName is missing", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse({ meta: { longName: undefined, shortName: "AbbVie" } }),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.name).toBe("AbbVie")
  })

  it("should fall back to symbol when both longName and shortName are missing", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse({ meta: { longName: undefined, shortName: undefined } }),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.name).toBe("ABBV")
  })

  it("should return null history when no close prices available", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse(),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.change1m).toBeNull()
    expect(result.change6m).toBeNull()
    expect(result.change2y).toBeNull()
  })

  it("should throw an error on network failure", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockRejectedValueOnce(new Error("Network request failed"))

    await expect(fetchStockQuote("ABBV")).rejects.toThrow("Failed to fetch stock quote: Network request failed")
  })

  it("should throw an error on malformed response", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ chart: { result: [], error: null } }),
    })

    await expect(fetchStockQuote("ABBV")).rejects.toThrow("Failed to fetch stock quote: Yahoo Finance API response missing expected chart.result[0].meta structure")
  })

  it("should throw an error on HTTP error status", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })

    await expect(fetchStockQuote("ABBV")).rejects.toThrow("Failed to fetch stock quote: Yahoo Finance API returned status 500: Internal Server Error")
  })

  it("should retry with fresh session on 401", async () => {
    // Initial session
    mockSessionHandshake(mockFetch)
    // Chart returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    })
    // Fresh session handshake
    mockSessionHandshake(mockFetch)
    // Retry chart succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse(),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.symbol).toBe("ABBV")
    expect(result.price).toBe(175.50)
    // 2 handshakes (2 calls each) + 2 chart requests = 6 total
    expect(mockFetch).toHaveBeenCalledTimes(6)
  })

  it("should parse dividend events from response", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse({
        dividends: {
          1700000000: { amount: 1.41, date: 1700000000 },
          1690000000: { amount: 1.35, date: 1690000000 },
        },
      }),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.dividends).toHaveLength(2)
    expect(result.dividends[0]).toEqual({ amount: 1.35, date: 1690000000 })
    expect(result.dividends[1]).toEqual({ amount: 1.41, date: 1700000000 })
  })

  it("should return empty dividends when no events in response", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse(),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.dividends).toEqual([])
  })

  it("should retry with fresh session on 403", async () => {
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    })
    mockSessionHandshake(mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeChartResponse(),
    })

    const result = await fetchStockQuote("ABBV")

    expect(result.symbol).toBe("ABBV")
  })
})

describe("constants", () => {
  it("should have exactly 69 dividend aristocrats", () => {
    expect(DIVIDEND_ARISTOCRATS).toHaveLength(69)
  })

  it("should have correct STOCK_IPC_CHANNEL value", () => {
    expect(STOCK_IPC_CHANNEL).toBe("stock:fetch-quote")
  })
})
