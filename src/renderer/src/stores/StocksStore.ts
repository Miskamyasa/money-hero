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

interface StocksCache {
  data: Record<string, StockQuote>
  timestamp: number
}

const STOCKS_CACHE_KEY = "stocks-cache"
const CACHE_TTL = 60 * 60 * 1000
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

  get totalCount(): number {
    return DIVIDEND_ARISTOCRATS.length
  }

  get progress(): number {
    return this.fetchedCount / this.totalCount
  }

  loadFromCache(): void {
    try {
      const cached = localStorage.getItem(STOCKS_CACHE_KEY)
      if (!cached)
        return

      const cache: StocksCache = JSON.parse(cached)
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        runInAction(() => {
          this.quotes = new Map(Object.entries(cache.data))
        })
      }
    }
    catch (error) {
      console.error("Failed to load stocks cache:", error)
    }
  }

  saveToCache(): void {
    try {
      const cache: StocksCache = {
        data: Object.fromEntries(this.quotes),
        timestamp: Date.now(),
      }
      localStorage.setItem(STOCKS_CACHE_KEY, JSON.stringify(cache))
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
    localStorage.removeItem(STOCKS_CACHE_KEY)
    this.startFetchQueue()
  }
}
