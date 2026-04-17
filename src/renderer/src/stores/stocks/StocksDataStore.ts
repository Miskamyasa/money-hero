import {makeAutoObservable, runInAction} from "mobx"

import {notifyError} from "@renderer/utils/notify"

import type {StockQuote} from "../../../../shared/stocks"
import type {FetchTask} from "../FetchQueueStore"
import type {RootStore} from "../RootStore"

const CACHE_SAVE_BATCH_SIZE = 5
const SECONDS_PER_DAY = 24 * 60 * 60
const DAYS_PER_MONTH = 30.44
const MONTHS_PER_YEAR = 12

export class StocksDataStore {
  quotes = new Map<string, StockQuote>()

  private pendingCacheWrites = 0

  constructor(private root: RootStore, private symbols: string[]) {
    makeAutoObservable(this)
  }

  get rootStore(): RootStore {
    return this.root
  }

  get totalCount(): number {
    return this.symbols.length
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
    if (!quote || quote.price <= 0 || quote.dividends.length === 0) {
      return null
    }

    const nowSeconds = Date.now() / 1000
    const periodSeconds = months * DAYS_PER_MONTH * SECONDS_PER_DAY
    const cutoff = nowSeconds - periodSeconds
    const divsInPeriod = quote.dividends.filter(d => d.date >= cutoff)

    if (divsInPeriod.length === 0) {
      return null
    }

    const totalDivs = divsInPeriod.reduce((sum, d) => sum + d.amount, 0)
    const annualized = totalDivs * (MONTHS_PER_YEAR / months)
    return (annualized / quote.price) * 100
  }

  getAmount(symbol: string): number {
    return this.root.stockAmounts.getAmount(symbol)
  }

  setAmount(symbol: string, value: number): void {
    this.root.stockAmounts.setAmount(symbol, value)
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
    const allowedSymbols = new Set(this.symbols)
    const quotes = Array.from(this.quotes.values())
      .filter(quote => allowedSymbols.has(quote.symbol))
    const plain = JSON.parse(JSON.stringify(quotes)) as StockQuote[]
    try {
      await window.api.saveStockCache(plain)
    }
    catch (error) {
      const symbols = plain.map(q => q.symbol)
      notifyError(`Failed to save stocks cache [${symbols.join(", ")}]`, error)
    }
  }

  createFetchTasks(): FetchTask[] {
    return this.symbols.map(symbol => ({
      label: `Stock ${symbol}`,
      execute: async () => {
        const data = await window.api.fetchStockQuote(symbol)
        runInAction(() => {
          this.quotes.set(symbol, data)
        })
        this.pendingCacheWrites++
        if (this.pendingCacheWrites >= CACHE_SAVE_BATCH_SIZE) {
          await this.saveToCache()
          this.pendingCacheWrites = 0
        }
      },
    }))
  }

  createFlushCacheTask(): FetchTask {
    return {
      label: "Save cache",
      execute: async () => {
        await this.saveToCache()
        this.pendingCacheWrites = 0
      },
    }
  }

  async loadAmounts(): Promise<void> {
    await this.root.stockAmounts.loadAmounts()
  }
}
