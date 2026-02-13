import type { StockQuote } from "../../../shared/stocks"

import type { RootStore } from "./RootStore"

import { computed, makeAutoObservable, runInAction } from "mobx"
import { notifyError } from "../utils/notify"

const FETCH_INTERVAL = 1000
const CACHE_SAVE_BATCH_SIZE = 5
export const DIVIDEND_ARISTOCRATS = ["ABBV", "ABT", "ADM", "ADP", "AFL", "ALB", "AMCR", "AOS", "APD", "ATO", "BDX", "BEN", "BF-B", "BRO", "CAH", "CAT", "CB", "CHD", "CINF", "CL", "CLX", "CTAS", "CVX", "DOV", "ECL", "ED", "EMR", "ESS", "EXPD", "FRT", "GD", "GPC", "GWW", "HRL", "IBM", "ITW", "JNJ", "KMB", "KO", "LIN", "LOW", "MCD", "MDT", "MKC", "MMM", "NEE", "NUE", "O", "PEP", "PG", "PNR", "PPG", "ROP", "SHW", "SPGI", "SWK", "SYY", "TGT", "TROW", "VFC", "WMT", "WST", "XOM", "DHR", "XYL", "AWK", "WTRG", "SJW", "YORW"]
export const HIGH_YIELD = ["MPLX", "EPD", "VICI", "VZ", "HPQ", "OKE", "NNN", "O", "MO", "PFE", "DOC", "CAG", "KHC", "BBY", "EIX", "CPB", "PRU", "AMCR", "LYB", "UPS", "DUK", "ABBV", "VEDL.NS", "HINDZINC.NS", "RECLTD.NS", "LGEN.L", "PHNX.L", "IMB.L", "LAND.L", "AV.L", "MNG.L"]

export class StocksStore {
  private symbols: string[]
  private storageKey: string

  constructor(private root: RootStore, symbols: string[], storageKey: string = "default") {
    this.symbols = symbols
    this.storageKey = storageKey
    makeAutoObservable(this, {
      allocationSnapshot: computed({ keepAlive: true }),
      allocations: computed({ keepAlive: true }),
    })
  }

  quotes = new Map<string, StockQuote>()
  amounts = new Map<string, number>()
  loading = false
  fetchedCount = 0
  errors = new Map<string, string>()
  editingSymbol: string | null = null
  buyingMode = false
  investmentAmount = 0
  disabledSymbols = new Set<string>()

  private queueAbortController: AbortController | null = null
  private fetchQueuePromise: Promise<void> | null = null
  private amountWriteVersion = new Map<string, number>()

  get rootStore(): RootStore {
    return this.root
  }

  get allSymbols(): string[] {
    return this.symbols
  }

  get activeQuotes(): StockQuote[] {
    return Array.from(this.quotes.values()).filter(q => !this.disabledSymbols.has(q.symbol))
  }

  getBalance(symbol: string): number {
    const amount = this.getAmount(symbol)
    const quote = this.quotes.get(symbol)
    return amount * (quote?.price ?? 0)
  }

  getDividendYield(symbol: string, months: number): number | null {
    if (months <= 0) {
      return null
    }

    const quote = this.quotes.get(symbol)
    if (!quote || quote.price <= 0 || !quote.dividends || quote.dividends.length === 0) {
      return null
    }

    const now = Date.now() / 1000
    const cutoff = now - (months * 30.44 * 24 * 60 * 60)
    const divsInPeriod = quote.dividends.filter(d => d.date >= cutoff)

    if (divsInPeriod.length === 0) {
      return null
    }

    const totalDivs = divsInPeriod.reduce((sum, d) => sum + d.amount, 0)
    const annualized = totalDivs * (12 / months)
    return (annualized / quote.price) * 100
  }

  getAmount(symbol: string): number {
    return this.amounts.get(symbol) ?? 0
  }

  setAmount(symbol: string, value: number): void {
    const previousValue = this.getAmount(symbol)
    this.amounts.set(symbol, value)
    const writeVersion = (this.amountWriteVersion.get(symbol) ?? 0) + 1
    this.amountWriteVersion.set(symbol, writeVersion)

    void window.api.setStockAmount(symbol, value).catch((error) => {
      if (this.amountWriteVersion.get(symbol) !== writeVersion)
        return

      runInAction(() => {
        this.amounts.set(symbol, previousValue)
      })
      notifyError(`Failed to save amount for ${symbol}`, error)
    })
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

  toggleSymbol(symbol: string): void {
    if (this.disabledSymbols.has(symbol)) {
      this.disabledSymbols.delete(symbol)
    }
    else {
      this.disabledSymbols.add(symbol)
    }
    this.saveDisabledSymbols()
  }

  isSymbolEnabled(symbol: string): boolean {
    return !this.disabledSymbols.has(symbol)
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

  get allocationSnapshot(): { allocations: Map<string, number>, balances: Map<string, number> } {
    if (!this.buyingMode || this.investmentAmount <= 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
    }

    const scoreable = Array.from(this.quotes.values())
      .filter(q => q.change2y != null)

    if (scoreable.length === 0) {
      return {
        allocations: new Map(),
        balances: new Map(),
      }
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

    const allocations = new Map<string, number>()
    const balances = new Map<string, number>()
    let remaining = this.investmentAmount
    let changed = true

    while (changed) {
      changed = false
      for (const stock of ranked) {
        if (stock.price > 0 && stock.price <= remaining) {
          allocations.set(stock.symbol, (allocations.get(stock.symbol) ?? 0) + 1)
          balances.set(stock.symbol, (balances.get(stock.symbol) ?? 0) + stock.price)
          remaining -= stock.price
          changed = true
        }
      }
    }

    return {
      allocations,
      balances,
    }
  }

  get allocations(): Map<string, number> {
    return this.allocationSnapshot.allocations
  }

  getAllocation(symbol: string): number {
    return this.allocationSnapshot.allocations.get(symbol) ?? 0
  }

  getAllocationBalance(symbol: string): number {
    return this.allocationSnapshot.balances.get(symbol) ?? 0
  }

  get totalCount(): number {
    return this.symbols.length
  }

  get progress(): number {
    if (this.totalCount === 0) {
      return 0
    }
    return this.fetchedCount / this.totalCount
  }

  async loadFromCache(): Promise<void> {
    try {
      const symbols = [...this.symbols]
      const allowedSymbols = new Set(symbols)
      const cached = await window.api.getStockCache(symbols)
      const scopedCached = cached.filter(quote => allowedSymbols.has(quote.symbol))
      if (scopedCached.length > 0) {
        runInAction(() => {
          this.quotes = new Map(scopedCached.map(q => [q.symbol, q]))
        })
      }
    }
    catch (error) {
      notifyError("Failed to load stocks cache", error)
    }
  }

  async saveToCache(): Promise<void> {
    try {
      const allowedSymbols = new Set(this.symbols)
      const quotes = Array.from(this.quotes.values(), quote => ({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        previousClose: quote.previousClose,
        change: quote.change,
        changePercent: quote.changePercent,
        currency: quote.currency,
        change1m: quote.change1m,
        change6m: quote.change6m,
        change2y: quote.change2y,
        dividends: quote.dividends.map(d => ({ amount: d.amount, date: d.date })),
      })).filter(quote => allowedSymbols.has(quote.symbol))
      await window.api.saveStockCache(quotes)
    }
    catch (error) {
      notifyError("Failed to save stocks cache", error)
    }
  }

  async startFetchQueue(): Promise<void> {
    if (this.fetchQueuePromise) {
      if (!this.queueAbortController?.signal.aborted) {
        return this.fetchQueuePromise
      }
      await this.fetchQueuePromise
    }

    const abortController = new AbortController()
    this.queueAbortController = abortController

    const runPromise = (async () => {
      let pendingCacheWrites = 0
      runInAction(() => {
        this.loading = true
        this.fetchedCount = 0
      })

      for (let i = 0; i < this.symbols.length; i++) {
        if (abortController.signal.aborted)
          break

        const symbol = this.symbols[i]
        try {
          const data = await window.api.fetchStockQuote(symbol)

          if (abortController.signal.aborted) {
            break
          }

          runInAction(() => {
            this.quotes.set(symbol, data)
          })
          pendingCacheWrites++
          if (pendingCacheWrites >= CACHE_SAVE_BATCH_SIZE) {
            await this.saveToCache()
            pendingCacheWrites = 0
          }
        }
        catch (error) {
          if (abortController.signal.aborted) {
            break
          }

          const errorMessage = error instanceof Error ? error.message : "Failed to fetch quote"
          runInAction(() => {
            this.errors.set(symbol, errorMessage)
          })
          notifyError(`Failed to fetch ${symbol}`, error)
        }

        if (!abortController.signal.aborted) {
          runInAction(() => {
            this.fetchedCount++
          })
        }

        if (i < this.symbols.length - 1 && !abortController.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, FETCH_INTERVAL))
        }
      }

      if (!abortController.signal.aborted && pendingCacheWrites > 0) {
        await this.saveToCache()
      }
    })()

    this.fetchQueuePromise = runPromise

    try {
      await runPromise
    }
    finally {
      if (this.fetchQueuePromise === runPromise) {
        this.fetchQueuePromise = null
      }
      if (this.queueAbortController === abortController) {
        this.queueAbortController = null
      }
      runInAction(() => {
        this.loading = false
      })
    }
  }

  stopFetchQueue(): void {
    this.queueAbortController?.abort()
    runInAction(() => {
      this.loading = false
    })
  }

  async refreshAll(): Promise<void> {
    this.stopFetchQueue()
    runInAction(() => {
      this.quotes.clear()
      this.errors.clear()
    })
    try {
      await window.api.clearStockCache([...this.symbols])
    }
    catch (error) {
      notifyError("Failed to clear stocks cache", error)
    }
    await this.startFetchQueue()
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
      notifyError("Failed to load stock amounts", error)
    }
  }

  private saveDisabledSymbols(): void {
    const key = `money-hero-disabled-stocks-${this.storageKey}`
    const array = Array.from(this.disabledSymbols)
    localStorage.setItem(key, JSON.stringify(array))
  }

  loadDisabledSymbols(): void {
    const key = `money-hero-disabled-stocks-${this.storageKey}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const array = JSON.parse(stored) as string[]
        this.disabledSymbols = new Set(array)
      }
      catch (error) {
        notifyError("Failed to load disabled stocks from localStorage", error)
      }
    }
  }
}
