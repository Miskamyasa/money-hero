import type { StockQuote } from "../../../../shared/stocks"
import type { RootStore } from "../RootStore"

import { notifyError } from "@renderer/utils/notify"
import { makeAutoObservable, runInAction } from "mobx"

const FETCH_INTERVAL = 1000
const CACHE_SAVE_BATCH_SIZE = 5

export class StocksDataStore {
  quotes = new Map<string, StockQuote>()
  amounts = new Map<string, number>()
  loading = false
  fetchedCount = 0
  errors = new Map<string, string>()

  private queueAbortController: AbortController | null = null
  private fetchQueuePromise: Promise<void> | null = null
  private amountWriteVersion = new Map<string, number>()

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
}
