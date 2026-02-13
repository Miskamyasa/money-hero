import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App"

describe("app", () => {
  beforeEach(() => {
    window.api = {
      fetchGoldQuote: vi.fn(),
      fetchGoldHistory: vi.fn(),
      fetchStockQuote: vi.fn(),
      getStockCache: vi.fn().mockResolvedValue([]),
      saveStockCache: vi.fn().mockResolvedValue(undefined),
      clearStockCache: vi.fn().mockResolvedValue(undefined),
      getStockAmounts: vi.fn().mockResolvedValue({}),
      setStockAmount: vi.fn().mockResolvedValue(undefined),
    } as any
  })

  it("renders the heading", () => {
    render(<App />)

    expect(screen.getByRole("heading", { name: /money hero/i })).toBeInTheDocument()
  })
})
