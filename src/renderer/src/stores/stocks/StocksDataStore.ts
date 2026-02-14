import type { StockQuote } from "../../../../shared/stocks"
import type { RootStore } from "../RootStore"

import { notifyError } from "@renderer/utils/notify"
import { makeAutoObservable, runInAction } from "mobx"

const FETCH_INTERVAL = 1000
const CACHE_SAVE_BATCH_SIZE = 5
const SECONDS_PER_DAY = 24 * 60 * 60
const DAYS_PER_MONTH = 30.44
const MONTHS_PER_YEAR = 12

export class StocksDataStore {
  quotes = new Map<string, StockQuote>()
  loading = false
  fetchedCount = 0

  private queueAbortController: AbortController | null = null
  private fetchQueuePromise: Promise<void> | null = null

  constructor(private root: RootStore, private symbols: string[]) {
    makeAutoObservable(this)
  }

  get rootStore(): RootStore {
    return this.root
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
    try {
      const allowedSymbols = new Set(this.symbols)
      const quotes = Array.from(this.quotes.values())
        .filter(quote => allowedSymbols.has(quote.symbol))
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

  private async stopFetchQueueAndWait(): Promise<void> {
    this.queueAbortController?.abort()
    const runningQueue = this.fetchQueuePromise
    if (runningQueue) {
      await runningQueue
    }
    runInAction(() => {
      this.loading = false
    })
  }

  async refreshAll(): Promise<void> {
    await this.stopFetchQueueAndWait()
    await this.startFetchQueue()
  }

  async loadAmounts(): Promise<void> {
    await this.root.stockAmounts.loadAmounts()
  }
}
