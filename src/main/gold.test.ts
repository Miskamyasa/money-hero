import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchGoldHistory, fetchGoldQuote } from "./gold"

describe("fetchGoldQuote", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return a valid GoldQuote on successful fetch", async () => {
    const mockResponse = {
      chart: {
        result: [{
          meta: {
            currency: "USD",
            symbol: "GC=F",
            regularMarketPrice: 2650.0,
            chartPreviousClose: 2640.0,
          },
        }],
        error: null,
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchGoldQuote()

    expect(result).toEqual({
      price: 2650.0,
      previousClose: 2640.0,
      change: 10.0,
      changePercent: 0.3787878787878788,
      currency: "USD",
      symbol: "GC=F",
    })
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("should throw an error on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network request failed"))

    await expect(fetchGoldQuote()).rejects.toThrow("Failed to fetch gold quote: Network request failed")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("should throw an error on malformed response", async () => {
    const mockResponse = {
      chart: {
        result: [],
        error: null,
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    await expect(fetchGoldQuote()).rejects.toThrow("Failed to fetch gold quote: Yahoo Finance API response missing expected chart.result[0].meta structure")
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it("should throw an error on HTTP error status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    })

    await expect(fetchGoldQuote()).rejects.toThrow("Failed to fetch gold quote: Yahoo Finance API returned status 500: Internal Server Error")
    expect(mockFetch).toHaveBeenCalledOnce()
  })
})

describe("fetchGoldHistory", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return valid history with all periods", async () => {
    // 24 monthly data points (2 years)
    const closePrices = [
      2000,
      2020,
      2040,
      2060,
      2080,
      2100,
      2120,
      2140,
      2160,
      2180,
      2200,
      2220,
      2240,
      2260,
      2280,
      2300,
      2320,
      2340,
      2360,
      2380,
      2400,
      2420,
      2440,
      2460,
    ]

    const mockResponse = {
      chart: {
        result: [{
          meta: { regularMarketPrice: 2500 },
          indicators: { quote: [{ close: closePrices }] },
        }],
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchGoldHistory()

    // 1m: (2500 - 2440) / 2440 * 100 (second-to-last close)
    expect(result.change1m).toBeCloseTo(2.4590, 2)
    // 6m: (2500 - 2340) / 2340 * 100 (7th from end)
    expect(result.change6m).toBeCloseTo(6.8376, 2)
    // 2y: (2500 - 2000) / 2000 * 100 (first close)
    expect(result.change2y).toBeCloseTo(25.0, 2)
  })

  it("should return null for periods with insufficient data", async () => {
    // Only 3 data points — not enough for 6m or 2y
    const closePrices = [2000, 2100, 2200]

    const mockResponse = {
      chart: {
        result: [{
          meta: { regularMarketPrice: 2300 },
          indicators: { quote: [{ close: closePrices }] },
        }],
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchGoldHistory()

    // 1m: (2300 - 2100) / 2100 * 100 (second-to-last close)
    expect(result.change1m).toBeCloseTo(9.5238, 2)
    expect(result.change6m).toBeNull()
    // 2y: (2300 - 2000) / 2000 * 100 (first close)
    expect(result.change2y).toBeCloseTo(15.0, 2)
  })

  it("should handle null values in close prices", async () => {
    const closePrices = [2000, null, 2100, null, 2200, null, 2300]

    const mockResponse = {
      chart: {
        result: [{
          meta: { regularMarketPrice: 2400 },
          indicators: { quote: [{ close: closePrices }] },
        }],
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchGoldHistory()

    // After filtering nulls: [2000, 2100, 2200, 2300] (4 valid points)
    // 1m: (2400 - 2200) / 2200 * 100 (second-to-last valid close)
    expect(result.change1m).toBeCloseTo(9.0909, 2)
    // 6m: null (only 4 valid points, need 7)
    expect(result.change6m).toBeNull()
    // 2y: (2400 - 2000) / 2000 * 100 (first valid close)
    expect(result.change2y).toBeCloseTo(20.0, 2)
  })

  it("should throw an error on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("Network request failed"))

    await expect(fetchGoldHistory()).rejects.toThrow("Failed to fetch gold history: Network request failed")
  })

  it("should throw an error on malformed response", async () => {
    const mockResponse = {
      chart: {
        result: [],
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    await expect(fetchGoldHistory()).rejects.toThrow("Failed to fetch gold history: Yahoo Finance API response missing expected chart.result[0].meta structure")
  })

  it("should throw an error on HTTP error status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    })

    await expect(fetchGoldHistory()).rejects.toThrow("Failed to fetch gold history: Yahoo Finance API returned status 503: Service Unavailable")
  })

  it("should handle empty close prices array", async () => {
    const mockResponse = {
      chart: {
        result: [{
          meta: { regularMarketPrice: 2500 },
          indicators: { quote: [{ close: [] }] },
        }],
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchGoldHistory()

    expect(result.change1m).toBeNull()
    expect(result.change6m).toBeNull()
    expect(result.change2y).toBeNull()
  })

  it("should handle missing indicators gracefully", async () => {
    const mockResponse = {
      chart: {
        result: [{
          meta: { regularMarketPrice: 2500 },
        }],
      },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await fetchGoldHistory()

    expect(result.change1m).toBeNull()
    expect(result.change6m).toBeNull()
    expect(result.change2y).toBeNull()
  })
})
