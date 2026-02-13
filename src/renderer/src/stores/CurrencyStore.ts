import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

interface CurrencyRate {
  symbol: string
  label: string
  rate: number
  changePercent: number
}

interface DollarIndex {
  value: number
  changePercent: number
}

interface CurrencyRatesData {
  dollar: DollarIndex
  currencies: CurrencyRate[]
}

export class CurrencyStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  data: CurrencyRatesData | null = null
  loading = false
  error: string | null = null

  get rootStore(): RootStore {
    return this.root
  }

  async fetchRates(): Promise<void> {
    this.loading = true
    this.error = null
    try {
      const data = await window.api.fetchCurrencyRates()
      runInAction(() => {
        this.data = data as CurrencyRatesData
        this.loading = false
      })
    }
    catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : "Failed to fetch currency rates"
        this.loading = false
      })
    }
  }
}
