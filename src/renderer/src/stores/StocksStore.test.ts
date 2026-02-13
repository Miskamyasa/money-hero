import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RootStore } from "./RootStore"
import { StocksStore } from "./StocksStore"

describe("stocksStore", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.api = {
      fetchStockQuote: vi.fn(),
      getStockCache: vi.fn().mockResolvedValue([]),
      saveStockCache: vi.fn().mockResolvedValue(undefined),
      clearStockCache: vi.fn().mockResolvedValue(undefined),
      getStockAmounts: vi.fn().mockResolvedValue({}),
      setStockAmount: vi.fn().mockResolvedValue(undefined),
    } as any
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

  it("loads from cache with valid cache", async () => {
    const mockQuotes = [
      {
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
      {
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
    ]

    vi.mocked(window.api.getStockCache).mockResolvedValue(mockQuotes)

    const root = new RootStore()
    const store = new StocksStore(root)

    await store.loadFromCache()

    expect(store.quotes.size).toBe(2)
    expect(store.quotes.get("ABBV")).toEqual(mockQuotes[0])
    expect(store.quotes.get("ABT")).toEqual(mockQuotes[1])
  })

  it("loads from cache with expired cache", async () => {
    vi.mocked(window.api.getStockCache).mockResolvedValue([])

    const root = new RootStore()
    const store = new StocksStore(root)

    await store.loadFromCache()

    expect(store.quotes.size).toBe(0)
  })

  it("loads from cache with no cache", async () => {
    vi.mocked(window.api.getStockCache).mockResolvedValue([])

    const root = new RootStore()
    const store = new StocksStore(root)

    await store.loadFromCache()

    expect(store.quotes.size).toBe(0)
  })

  it("saves to cache", async () => {
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
    await store.saveToCache()

    expect(window.api.saveStockCache).toHaveBeenCalledWith([mockQuote])
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
    expect(window.api.clearStockCache).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(0)
    expect(store.loading).toBe(true)

    store.stopFetchQueue()
  })

  it("returns totalCount of 69", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    expect(store.totalCount).toBe(69)
  })

  it("computes progress correctly", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    expect(store.progress).toBe(0)

    store.fetchedCount = 10
    expect(store.progress).toBeCloseTo(10 / store.totalCount)

    store.fetchedCount = store.totalCount
    expect(store.progress).toBe(1)
  })

  it("starts with buyingMode false and investmentAmount 0", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    expect(store.buyingMode).toBe(false)
    expect(store.investmentAmount).toBe(0)
  })

  it("toggles buying mode on and off", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.toggleBuyingMode()
    expect(store.buyingMode).toBe(true)

    store.setInvestmentAmount(1000)
    expect(store.investmentAmount).toBe(1000)

    store.toggleBuyingMode()
    expect(store.buyingMode).toBe(false)
    expect(store.investmentAmount).toBe(0)
  })

  it("returns empty allocations when buying mode is off", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("ABBV", {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 20,
    })

    store.setInvestmentAmount(1000)
    expect(store.allocations.size).toBe(0)
  })

  it("returns empty allocations when investment amount is 0", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.toggleBuyingMode()
    store.quotes.set("ABBV", {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 20,
    })

    expect(store.allocations.size).toBe(0)
  })

  it("allocates to a single stock", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("ABBV", {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 20,
    })

    store.toggleBuyingMode()
    store.setInvestmentAmount(350)

    expect(store.getAllocation("ABBV")).toBe(3)
    expect(store.getAllocationBalance("ABBV")).toBe(300)
    expect(store.totalAllocated).toBe(300)
  })

  it("prioritizes higher 2y growth stocks", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("HIGH", {
      symbol: "HIGH",
      name: "High Growth",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 50,
    })
    store.quotes.set("LOW", {
      symbol: "LOW",
      name: "Low Growth",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 2,
      change6m: 5,
      change2y: 10,
    })

    store.toggleBuyingMode()
    store.setInvestmentAmount(300)

    // Both same price, no existing holdings
    // HIGH has better growth rank (1) + same scarcity rank
    // Round-robin: HIGH gets 1, LOW gets 1, then HIGH gets 1 (higher priority)
    expect(store.getAllocation("HIGH")).toBe(2)
    expect(store.getAllocation("LOW")).toBe(1)
  })

  it("prioritizes stocks with lower existing amounts", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    // Give OWNED worse growth so scarcity is the deciding factor
    store.quotes.set("OWNED", {
      symbol: "OWNED",
      name: "Owned Stock",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 30,
    })
    store.quotes.set("FRESH", {
      symbol: "FRESH",
      name: "Fresh Stock",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 25,
    })

    // OWNED already held heavily, FRESH not owned at all
    store.setAmount("OWNED", 10)
    store.setAmount("FRESH", 0)

    store.toggleBuyingMode()
    store.setInvestmentAmount(300)

    // OWNED: growthRank=1 (30%) + scarcityRank=2 (10 owned) = 3
    // FRESH: growthRank=2 (25%) + scarcityRank=1 (0 owned) = 3
    // Tied at 3, tiebreaker is alphabetical: FRESH first
    // Round 1: FRESH $100 (rem $200), OWNED $100 (rem $100)
    // Round 2: FRESH $100 (rem $0)
    expect(store.getAllocation("FRESH")).toBe(2)
    expect(store.getAllocation("OWNED")).toBe(1)
  })

  it("skips stocks without change2y data", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("GOOD", {
      symbol: "GOOD",
      name: "Good Stock",
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1,
      currency: "USD",
      change1m: 5,
      change6m: 10,
      change2y: 20,
    })
    store.quotes.set("NODATA", {
      symbol: "NODATA",
      name: "No Data Stock",
      price: 50,
      previousClose: 49,
      change: 1,
      changePercent: 2,
      currency: "USD",
      change1m: 3,
      change6m: 7,
      change2y: null,
    })

    store.toggleBuyingMode()
    store.setInvestmentAmount(500)

    expect(store.getAllocation("GOOD")).toBe(5)
    expect(store.getAllocation("NODATA")).toBe(0)
  })

  it("handles budget too small for any stock", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("EXPENSIVE", {
      symbol: "EXPENSIVE",
      name: "Expensive Stock",
      price: 500,
      previousClose: 499,
      change: 1,
      changePercent: 0.2,
      currency: "USD",
      change1m: 1,
      change6m: 5,
      change2y: 15,
    })

    store.toggleBuyingMode()
    store.setInvestmentAmount(100)

    expect(store.allocations.size).toBe(0)
    expect(store.totalAllocated).toBe(0)
  })

  it("allocates across multiple stocks with different prices using round-robin", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("CHEAP", {
      symbol: "CHEAP",
      name: "Cheap Stock",
      price: 50,
      previousClose: 49,
      change: 1,
      changePercent: 2,
      currency: "USD",
      change1m: 3,
      change6m: 8,
      change2y: 40,
    })
    store.quotes.set("MID", {
      symbol: "MID",
      name: "Mid Stock",
      price: 150,
      previousClose: 149,
      change: 1,
      changePercent: 0.67,
      currency: "USD",
      change1m: 2,
      change6m: 6,
      change2y: 25,
    })
    store.quotes.set("PRICEY", {
      symbol: "PRICEY",
      name: "Pricey Stock",
      price: 300,
      previousClose: 299,
      change: 1,
      changePercent: 0.33,
      currency: "USD",
      change1m: 1,
      change6m: 4,
      change2y: 10,
    })

    store.toggleBuyingMode()
    store.setInvestmentAmount(1000)

    // Priority order: CHEAP (best growth), MID, PRICEY
    // Round 1: CHEAP $50 (rem $950), MID $150 (rem $800), PRICEY $300 (rem $500)
    // Round 2: CHEAP $50 (rem $450), MID $150 (rem $300), PRICEY $300 (rem $0)
    // Round 3: nothing fits
    expect(store.getAllocation("CHEAP")).toBe(2)
    expect(store.getAllocation("MID")).toBe(2)
    expect(store.getAllocation("PRICEY")).toBe(2)
    expect(store.totalAllocated).toBe(1000)
  })

  it("getAllocation returns 0 for unknown symbol", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.toggleBuyingMode()
    store.setInvestmentAmount(1000)

    expect(store.getAllocation("UNKNOWN")).toBe(0)
  })

  it("getAllocationBalance computes correctly", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.quotes.set("TEST", {
      symbol: "TEST",
      name: "Test Stock",
      price: 75,
      previousClose: 74,
      change: 1,
      changePercent: 1.35,
      currency: "USD",
      change1m: 2,
      change6m: 5,
      change2y: 15,
    })

    store.toggleBuyingMode()
    store.setInvestmentAmount(200)

    // Should buy 2 shares at $75 = $150
    expect(store.getAllocation("TEST")).toBe(2)
    expect(store.getAllocationBalance("TEST")).toBe(150)
  })

  it("persists amount via setStockAmount", () => {
    const root = new RootStore()
    const store = new StocksStore(root)

    store.setAmount("ABBV", 5)

    expect(window.api.setStockAmount).toHaveBeenCalledWith("ABBV", 5)
  })

  it("loads amounts from database", async () => {
    vi.mocked(window.api.getStockAmounts).mockResolvedValue({ ABBV: 10, ABT: 5 })

    const root = new RootStore()
    const store = new StocksStore(root)

    await store.loadAmounts()

    expect(store.getAmount("ABBV")).toBe(10)
    expect(store.getAmount("ABT")).toBe(5)
  })
})
