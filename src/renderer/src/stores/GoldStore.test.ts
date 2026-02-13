import { beforeEach, describe, expect, it, vi } from "vitest"
import { GoldStore } from "./GoldStore"
import { RootStore } from "./RootStore"

describe("goldStore", () => {
  beforeEach(() => {
    window.api = {
      fetchGoldQuote: vi.fn(),
    } as any
  })

  it("starts with null quote", () => {
    const root = new RootStore()
    const store = new GoldStore(root)

    expect(store.quote).toBe(null)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
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
})
