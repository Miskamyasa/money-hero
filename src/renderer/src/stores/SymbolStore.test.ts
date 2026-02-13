import { beforeEach, describe, expect, it, vi } from "vitest"
import { RootStore } from "./RootStore"
import { SymbolStore } from "./SymbolStore"

describe("symbolStore", () => {
  beforeEach(() => {
    window.api = {
      fetchStockQuote: vi.fn(),
      getStockAmounts: vi.fn().mockResolvedValue({}),
      setStockAmount: vi.fn().mockResolvedValue(undefined),
    } as any
  })

  it("starts with amount 0, balance 0, editingAmount false", () => {
    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    expect(store.amount).toBe(0)
    expect(store.balance).toBe(0)
    expect(store.editingAmount).toBe(false)
  })

  it("setAmount updates local amount and calls window.api.setStockAmount", () => {
    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    store.setAmount(5)

    expect(store.amount).toBe(5)
    expect(window.api.setStockAmount).toHaveBeenCalledWith("VOO", 5)
  })

  it("balance computes amount * price when quote is set", () => {
    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    store.quote = {
      symbol: "VOO",
      name: "Vanguard S&P 500 ETF",
      price: 400.50,
      previousClose: 399.00,
      change: 1.50,
      changePercent: 0.38,
      currency: "USD",
      change1m: 2.5,
      change6m: 10.0,
      change2y: 25.0,
    }
    store.setAmount(10)

    expect(store.balance).toBe(4005)
  })

  it("balance returns 0 when quote is null", () => {
    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    store.setAmount(10)

    expect(store.balance).toBe(0)
  })

  it("loadAmount reads from window.api.getStockAmounts and sets correct value", async () => {
    vi.mocked(window.api.getStockAmounts).mockResolvedValue({ VOO: 15, VTI: 20 })

    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    await store.loadAmount()

    expect(store.amount).toBe(15)
  })

  it("loadAmount sets amount to 0 when symbol not in response", async () => {
    vi.mocked(window.api.getStockAmounts).mockResolvedValue({ VTI: 20 })

    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    await store.loadAmount()

    expect(store.amount).toBe(0)
  })

  it("loadAmount handles errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(window.api.getStockAmounts).mockRejectedValue(new Error("Database error"))

    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    await store.loadAmount()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load amount for VOO:",
      expect.any(Error),
    )
    expect(store.amount).toBe(0)

    consoleErrorSpy.mockRestore()
  })

  it("startEditing sets editingAmount to true", () => {
    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    store.startEditing()

    expect(store.editingAmount).toBe(true)
  })

  it("stopEditing sets editingAmount to false", () => {
    const root = new RootStore()
    const store = new SymbolStore(root, "VOO")

    store.startEditing()
    expect(store.editingAmount).toBe(true)

    store.stopEditing()
    expect(store.editingAmount).toBe(false)
  })
})
