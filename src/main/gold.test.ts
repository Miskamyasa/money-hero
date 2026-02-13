import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchGoldQuote } from "./gold"

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
