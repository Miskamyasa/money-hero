import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

interface GoldQuote {
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  symbol: string
}

export class GoldStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  quote: GoldQuote | null = null
  loading = false
  error: string | null = null

  get rootStore(): RootStore {
    return this.root
  }

  async fetchQuote(): Promise<void> {
    this.loading = true
    this.error = null
    try {
      const data = await window.api.fetchGoldQuote()
      runInAction(() => {
        this.quote = data as GoldQuote
        this.loading = false
      })
    }
    catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : "Failed to fetch gold quote"
        this.loading = false
      })
    }
  }
}
