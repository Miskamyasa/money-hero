import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RootStore } from "./RootStore"
import { StocksStore } from "./StocksStore"

describe("stocksStore", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.api = {
      fetchStockQuote: vi.fn(),
    } as any
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("starts with empty quotes map, loading false, fetchedCount 0, empty errors map", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    expect(store.quotes.size).toBe(0)
    expect(store.loading).toBe(false)
    expect(store.fetchedCount).toBe(0)
    expect(store.errors.size).toBe(0)
  })

  it("loads from cache with valid cache", () => {
    const mockData = {
      ABBV: {
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 150.25,
        previousClose: 149.00,
        change: 1.25,
        changePercent: 0.84,
        currency: "USD",
        change1m: 2.5,
        change6m: 10.0,
        change2y: 25.0,
      },
      ABT: {
        symbol: "ABT",
        name: "Abbott Laboratories",
        price: 110.50,
        previousClose: 109.75,
        change: 0.75,
        changePercent: 0.68,
        currency: "USD",
        change1m: 1.2,
        change6m: 5.0,
        change2y: null,
      },
    }
    const cache = {
      data: mockData,
      timestamp: Date.now() - 30 * 60 * 1000,
    }

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(cache))

    const root = new RootStore()
    const store = new StocksStore(root)

    store.loadFromCache()

    expect(store.quotes.size).toBe(2)
    expect(store.quotes.get("ABBV")).toEqual(mockData.ABBV)
    expect(store.quotes.get("ABT")).toEqual(mockData.ABT)
  })

  it("loads from cache with expired cache", () => {
    const mockData = {
      ABBV: {
        symbol: "ABBV",
        name: "AbbVie Inc.",
        price: 150.25,
        previousClose: 149.00,
        change: 1.25,
        changePercent: 0.84,
        currency: "USD",
        change1m: 2.5,
        change6m: 10.0,
        change2y: 25.0,
      },
    }
    const cache = {
      data: mockData,
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
    }

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(cache))

    const root = new RootStore()
    const store = new StocksStore(root)

    store.loadFromCache()

    expect(store.quotes.size).toBe(0)
  })

  it("loads from cache with no cache", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null)

    const root = new RootStore()
    const store = new StocksStore(root)

    store.loadFromCache()

    expect(store.quotes.size).toBe(0)
  })

  it("loads from cache with invalid JSON", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("invalid json {")

    const root = new RootStore()
    const store = new StocksStore(root)

    expect(() => store.loadFromCache()).not.toThrow()
    expect(store.quotes.size).toBe(0)
  })

  it("saves to cache", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    const mockQuote = {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 150.25,
      previousClose: 149.00,
      change: 1.25,
      changePercent: 0.84,
      currency: "USD",
      change1m: 2.5,
      change6m: 10.0,
      change2y: 25.0,
    }

    store.quotes.set("ABBV", mockQuote)
    store.saveToCache()

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "stocks-cache",
      expect.stringContaining("ABBV"),
    )

    const callArgs = vi.mocked(localStorage.setItem).mock.calls[0]
    const savedData = JSON.parse(callArgs[1])
    expect(savedData.data.ABBV).toEqual(mockQuote)
    expect(savedData.timestamp).toBeDefined()
  })

  it("fetches tickers sequentially in queue", async () => {
    const mockQuote1 = {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 150.25,
      previousClose: 149.00,
      change: 1.25,
      changePercent: 0.84,
      currency: "USD",
      change1m: 2.5,
      change6m: 10.0,
      change2y: 25.0,
    }
    const mockQuote2 = {
      symbol: "ABT",
      name: "Abbott Laboratories",
      price: 110.50,
      previousClose: 109.75,
      change: 0.75,
      changePercent: 0.68,
      currency: "USD",
      change1m: 1.2,
      change6m: 5.0,
      change2y: null,
    }

    vi.mocked(window.api.fetchStockQuote)
      .mockResolvedValueOnce(mockQuote1)
      .mockResolvedValueOnce(mockQuote2)
      .mockResolvedValue({
        symbol: "TEST",
        name: "Test Corp",
        price: 100,
        previousClose: 100,
        change: 0,
        changePercent: 0,
        currency: "USD",
        change1m: null,
        change6m: null,
        change2y: null,
      })

    const root = new RootStore()
    const store = new StocksStore(root)

    store.startFetchQueue()

    await vi.advanceTimersByTimeAsync(0)
    expect(store.loading).toBe(true)
    expect(store.fetchedCount).toBe(1)
    expect(store.quotes.get("ABBV")).toEqual(mockQuote1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(store.fetchedCount).toBe(2)
    expect(store.quotes.get("ABT")).toEqual(mockQuote2)

    store.stopFetchQueue()

    expect(store.loading).toBe(false)
  })

  it("handles individual errors in queue", async () => {
    const mockQuote = {
      symbol: "ABT",
      name: "Abbott Laboratories",
      price: 110.50,
      previousClose: 109.75,
      change: 0.75,
      changePercent: 0.68,
      currency: "USD",
      change1m: 1.2,
      change6m: 5.0,
      change2y: null,
    }

    vi.mocked(window.api.fetchStockQuote)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockQuote)
      .mockResolvedValue({
        symbol: "TEST",
        name: "Test Corp",
        price: 100,
        previousClose: 100,
        change: 0,
        changePercent: 0,
        currency: "USD",
        change1m: null,
        change6m: null,
        change2y: null,
      })

    const root = new RootStore()
    const store = new StocksStore(root)

    store.startFetchQueue()

    await vi.advanceTimersByTimeAsync(0)
    expect(store.errors.get("ABBV")).toBe("Network error")
    expect(store.fetchedCount).toBe(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(store.quotes.get("ABT")).toEqual(mockQuote)
    expect(store.fetchedCount).toBe(2)

    store.stopFetchQueue()
  })

  it("stops fetch queue and halts fetching", async () => {
    vi.mocked(window.api.fetchStockQuote).mockResolvedValue({
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 150.25,
      previousClose: 149.00,
      change: 1.25,
      changePercent: 0.84,
      currency: "USD",
      change1m: 2.5,
      change6m: 10.0,
      change2y: 25.0,
    })

    const root = new RootStore()
    const store = new StocksStore(root)

    store.startFetchQueue()

    await vi.advanceTimersByTimeAsync(0)
    expect(store.loading).toBe(true)

    store.stopFetchQueue()

    expect(store.loading).toBe(false)
  })

  it("refreshes all by clearing and restarting", async () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("ABBV", {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 150.25,
      previousClose: 149.00,
      change: 1.25,
      changePercent: 0.84,
      currency: "USD",
      change1m: 2.5,
      change6m: 10.0,
      change2y: 25.0,
    })
    store.errors.set("ABT", "Some error")

    vi.mocked(window.api.fetchStockQuote).mockResolvedValue({
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 151.00,
      previousClose: 150.25,
      change: 0.75,
      changePercent: 0.50,
      currency: "USD",
      change1m: 1.0,
      change6m: 8.0,
      change2y: 20.0,
    })

    store.refreshAll()

    expect(store.quotes.size).toBe(0)
    expect(store.errors.size).toBe(0)
    expect(localStorage.removeItem).toHaveBeenCalledWith("stocks-cache")

    await vi.advanceTimersByTimeAsync(0)
    expect(store.loading).toBe(true)

    store.stopFetchQueue()
  })

  it("returns totalCount of 71", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    expect(store.totalCount).toBe(71)
  })

  it("computes progress correctly", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    expect(store.progress).toBe(0)

    store.fetchedCount = 10
    expect(store.progress).toBeCloseTo(10 / 71)

    store.fetchedCount = 71
    expect(store.progress).toBe(1)
  })
})
