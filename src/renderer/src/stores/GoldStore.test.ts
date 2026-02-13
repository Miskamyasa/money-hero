import { beforeEach, describe, expect, it, vi } from "vitest"
import { GoldStore } from "./GoldStore"
import { RootStore } from "./RootStore"

describe("goldStore", () => {
  beforeEach(() => {
    window.api = {
      fetchGoldQuote: vi.fn(),
      fetchGoldHistory: vi.fn(),
      getStockAmounts: vi.fn().mockResolvedValue({}),
      setStockAmount: vi.fn().mockResolvedValue(undefined),
    } as any
  })

  it("starts with null quote", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    expect(store.quote).toBe(null)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })

  it("starts with null history", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    expect(store.history).toBe(null)
    expect(store.historyLoading).toBe(false)
    expect(store.historyError).toBe(null)
  })

  it("fetches quote successfully", async () => {
    const mockQuote = {
      price: 2000.50,
      previousClose: 1995.00,
      change: 5.50,
      changePercent: 0.28,
      currency: "USD",
      symbol: "XAUUSD",
    }

    vi.mocked(window.api.fetchGoldQuote).mockResolvedValue(mockQuote)

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.fetchQuote()

    expect(store.quote).toEqual(mockQuote)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })

  it("handles fetch error", async () => {
    const errorMessage = "Network error"
    vi.mocked(window.api.fetchGoldQuote).mockRejectedValue(new Error(errorMessage))

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.fetchQuote()

    expect(store.error).toBe(errorMessage)
    expect(store.quote).toBe(null)
    expect(store.loading).toBe(false)
  })

  it("sets loading state during fetch", async () => {
    let resolvePromise: (value: any) => void
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(window.api.fetchGoldQuote).mockReturnValue(delayedPromise as any)

    const root = new RootStore()
    const store = new GoldStore(root)

    const fetchPromise = store.fetchQuote()

    expect(store.loading).toBe(true)

    resolvePromise!({
      price: 2000.50,
      previousClose: 1995.00,
      change: 5.50,
      changePercent: 0.28,
      currency: "USD",
      symbol: "XAUUSD",
    })

    await fetchPromise

    expect(store.loading).toBe(false)
  })

  it("fetches history successfully", async () => {
    const mockHistory = {
      change1m: 3.25,
      change6m: 12.50,
      change2y: 45.80,
    }

    vi.mocked(window.api.fetchGoldHistory).mockResolvedValue(mockHistory)

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.fetchHistory()

    expect(store.history).toEqual(mockHistory)
    expect(store.historyLoading).toBe(false)
    expect(store.historyError).toBe(null)
  })

  it("handles history fetch error", async () => {
    const errorMessage = "Network error"
    vi.mocked(window.api.fetchGoldHistory).mockRejectedValue(new Error(errorMessage))

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.fetchHistory()

    expect(store.historyError).toBe(errorMessage)
    expect(store.history).toBe(null)
    expect(store.historyLoading).toBe(false)
  })

  it("sets loading state during history fetch", async () => {
    let resolvePromise: (value: any) => void
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(window.api.fetchGoldHistory).mockReturnValue(delayedPromise as any)

    const root = new RootStore()
    const store = new GoldStore(root)

    const fetchPromise = store.fetchHistory()

    expect(store.historyLoading).toBe(true)

    resolvePromise!({
      change1m: 3.25,
      change6m: 12.50,
      change2y: 45.80,
    })

    await fetchPromise

    expect(store.historyLoading).toBe(false)
  })

  it("fetches history with null periods", async () => {
    const mockHistory = {
      change1m: 2.50,
      change6m: null,
      change2y: null,
    }

    vi.mocked(window.api.fetchGoldHistory).mockResolvedValue(mockHistory)

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.fetchHistory()

    expect(store.history).toEqual(mockHistory)
    expect(store.history!.change1m).toBe(2.50)
    expect(store.history!.change6m).toBeNull()
    expect(store.history!.change2y).toBeNull()
  })

  it("starts with amount 0, balance 0, editingAmount false", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    expect(store.amount).toBe(0)
    expect(store.balance).toBe(0)
    expect(store.editingAmount).toBe(false)
  })

  it("setAmount updates local state and calls setStockAmount with GC=F", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    store.setAmount(5)

    expect(store.amount).toBe(5)
    expect(window.api.setStockAmount).toHaveBeenCalledWith("GC=F", 5)
  })

  it("balance computes amount * price when quote is set", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    store.quote = {
      price: 2000.50,
      previousClose: 1995.00,
      change: 5.50,
      changePercent: 0.28,
      currency: "USD",
      symbol: "XAUUSD",
    }
    store.setAmount(3)

    expect(store.balance).toBe(6001.50)
  })

  it("balance returns 0 when quote is null", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    store.setAmount(5)

    expect(store.balance).toBe(0)
  })

  it("loadAmount reads from getStockAmounts and sets GC=F value", async () => {
    vi.mocked(window.api.getStockAmounts).mockResolvedValue({ "GC=F": 10 })

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.loadAmount()

    expect(store.amount).toBe(10)
  })

  it("loadAmount sets amount to 0 when GC=F not in response", async () => {
    vi.mocked(window.api.getStockAmounts).mockResolvedValue({ OTHER: 5 })

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.loadAmount()

    expect(store.amount).toBe(0)
  })

  it("loadAmount handles errors gracefully", async () => {
    vi.mocked(window.api.getStockAmounts).mockRejectedValue(new Error("Database error"))

    const root = new RootStore()
    const store = new GoldStore(root)

    await store.loadAmount()

    expect(store.amount).toBe(0)
  })

  it("startEditing sets editingAmount to true", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    store.startEditing()

    expect(store.editingAmount).toBe(true)
  })

  it("stopEditing sets editingAmount to false", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    store.startEditing()
    expect(store.editingAmount).toBe(true)

    store.stopEditing()
    expect(store.editingAmount).toBe(false)
  })
})
