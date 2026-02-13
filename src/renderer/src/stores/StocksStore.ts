import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

interface StockQuote {
  symbol: string
  name: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  change1m: number | null
  change6m: number | null
  change2y: number | null
}

const FETCH_INTERVAL = 1000
const DIVIDEND_ARISTOCRATS = ["ABBV", "ABT", "ADM", "ADP", "AFL", "ALB", "AMCR", "AOS", "APD", "ATO", "BDX", "BEN", "BF.B", "BRO", "CAH", "CAT", "CB", "CHD", "CINF", "CL", "CLX", "CTAS", "CVX", "DOV", "ECL", "ED", "EMR", "ESS", "EXPD", "FRT", "GD", "GPC", "GWW", "HRL", "IBM", "ITW", "JNJ", "KMB", "KO", "LIN", "LOW", "MCD", "MDT", "MKC", "MMM", "NEE", "NUE", "O", "PBCT", "PEP", "PG", "PNR", "PPG", "ROP", "SHW", "SPGI", "SWK", "SYY", "TGT", "TROW", "VFC", "WBA", "WMT", "WST", "XOM", "DHR", "XYL", "AWK", "WTRG", "SJW", "YORW"]

export class StocksStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  quotes = new Map<string, StockQuote>()
  amounts = new Map<string, number>()
  loading = false
  fetchedCount = 0
  errors = new Map<string, string>()
  editingSymbol: string | null = null
  buyingMode = false
  investmentAmount = 0

  private queueAbortController: AbortController | null = null

  get rootStore(): RootStore {
    return this.root
  }

  getBalance(symbol: string): number {
    const amount = this.getAmount(symbol)
    const quote = this.quotes.get(symbol)
    return amount * (quote?.price ?? 0)
  }

  getAmount(symbol: string): number {
    return this.amounts.get(symbol) ?? 0
  }

  setAmount(symbol: string, value: number): void {
    this.amounts.set(symbol, value)
    window.api.setStockAmount(symbol, value)
  }

  startEditing(symbol: string): void {
    this.editingSymbol = symbol
  }

  stopEditing(): void {
    this.editingSymbol = null
  }

  isEditing(symbol: string): boolean {
    return this.editingSymbol === symbol
  }

  toggleBuyingMode(): void {
    this.buyingMode = !this.buyingMode
    if (!this.buyingMode) {
      this.investmentAmount = 0
    }
  }

  setInvestmentAmount(amount: number): void {
    this.investmentAmount = amount
  }

  get allocations(): Map<string, number> {
    if (!this.buyingMode || this.investmentAmount <= 0) {
      return new Map()
    }

    const scoreable = Array.from(this.quotes.values())
      .filter(q => q.change2y != null)

    if (scoreable.length === 0) {
      return new Map()
    }

    const byGrowth = [...scoreable].sort((a, b) => b.change2y! - a.change2y!)
    const growthRank = new Map(byGrowth.map((q, i) => [q.symbol, i + 1]))

    const byAmount = [...scoreable].sort(
      (a, b) => this.getAmount(a.symbol) - this.getAmount(b.symbol),
    )
    const scarcityRank = new Map(byAmount.map((q, i) => [q.symbol, i + 1]))

    const ranked = scoreable
      .map(q => ({
        symbol: q.symbol,
        price: q.price,
        priority: growthRank.get(q.symbol)! + scarcityRank.get(q.symbol)!,
      }))
      .sort((a, b) => a.priority - b.priority || a.symbol.localeCompare(b.symbol))

    const result = new Map<string, number>()
    let remaining = this.investmentAmount
    let changed = true

    while (changed) {
      changed = false
      for (const stock of ranked) {
        if (stock.price > 0 && stock.price <= remaining) {
          result.set(stock.symbol, (result.get(stock.symbol) ?? 0) + 1)
          remaining -= stock.price
          changed = true
        }
      }
    }

    return result
  }

  getAllocation(symbol: string): number {
    return this.allocations.get(symbol) ?? 0
  }

  getAllocationBalance(symbol: string): number {
    const allocation = this.getAllocation(symbol)
    const quote = this.quotes.get(symbol)
    return allocation * (quote?.price ?? 0)
  }

  get totalAllocated(): number {
    let total = 0
    for (const [symbol, count] of this.allocations) {
      const quote = this.quotes.get(symbol)
      total += count * (quote?.price ?? 0)
    }
    return total
  }

  get totalCount(): number {
    return DIVIDEND_ARISTOCRATS.length
  }

  get progress(): number {
    return this.fetchedCount / this.totalCount
  }

  async loadFromCache(): Promise<void> {
    try {
      const cached = await window.api.getStockCache()
      if (cached.length > 0) {
        runInAction(() => {
          this.quotes = new Map(cached.map(q => [q.symbol, q]))
        })
      }
    }
    catch (error) {
      console.error("Failed to load stocks cache:", error)
    }
  }

  async saveToCache(): Promise<void> {
    try {
      const quotes = Array.from(this.quotes.values())
      await window.api.saveStockCache(quotes)
    }
    catch (error) {
      console.error("Failed to save stocks cache:", error)
    }
  }

  async startFetchQueue(): Promise<void> {
    this.queueAbortController = new AbortController()
    runInAction(() => {
      this.loading = true
      this.fetchedCount = 0
    })

    for (let i = 0; i < DIVIDEND_ARISTOCRATS.length; i++) {
      if (this.queueAbortController.signal.aborted)
        break

      const symbol = DIVIDEND_ARISTOCRATS[i]
      try {
        const data = await window.api.fetchStockQuote(symbol)
        runInAction(() => {
          this.quotes.set(symbol, data as StockQuote)
        })
        this.saveToCache()
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch quote"
        runInAction(() => {
          this.errors.set(symbol, errorMessage)
        })
      }

      runInAction(() => {
        this.fetchedCount++
      })

      if (i < DIVIDEND_ARISTOCRATS.length - 1 && !this.queueAbortController.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, FETCH_INTERVAL))
      }
    }

    runInAction(() => {
      this.loading = false
    })
  }

  stopFetchQueue(): void {
    this.queueAbortController?.abort()
    runInAction(() => {
      this.loading = false
    })
  }

  refreshAll(): void {
    this.stopFetchQueue()
    runInAction(() => {
      this.quotes.clear()
      this.errors.clear()
    })
    window.api.clearStockCache()
    this.startFetchQueue()
  }

  async loadAmounts(): Promise<void> {
    try {
      const amounts = await window.api.getStockAmounts()
      runInAction(() => {
        for (const [symbol, amount] of Object.entries(amounts)) {
          this.amounts.set(symbol, amount)
        }
      })
    }
    catch (error) {
      console.error("Failed to load stock amounts:", error)
    }
  }
}
