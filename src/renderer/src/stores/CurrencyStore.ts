import type { FetchTask } from "./FetchQueueStore"
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

  get rootStore(): RootStore {
    return this.root
  }

  createFetchRatesTask(): FetchTask {
    return {
      label: "Currency rates",
      execute: async () => {
        const data = await window.api.fetchCurrencyRates()
        runInAction(() => {
          this.data = data as CurrencyRatesData
        })
      },
    }
  }
}
