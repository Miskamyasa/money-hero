import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

interface SymbolQuote {
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

export class SymbolStore {
  constructor(private root: RootStore, readonly symbol: string) {
    makeAutoObservable(this)
  }

  quote: SymbolQuote | null = null
  loading = false
  error: string | null = null

  get rootStore(): RootStore {
    return this.root
  }

  async fetchQuote(): Promise<void> {
    this.loading = true
    this.error = null
    try {
      const data = await window.api.fetchStockQuote(this.symbol)
      runInAction(() => {
        this.quote = data as SymbolQuote
        this.loading = false
      })
    }
    catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : `Failed to fetch ${this.symbol} quote`
        this.loading = false
      })
    }
  }
}
