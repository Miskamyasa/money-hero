import type { FetchTask } from "./FetchQueueStore"
import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

import { notifyError } from "../utils/notify"

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

  async loadFromCache(): Promise<void> {
    try {
      const raw = await window.api.getKvCache("currency:rates")
      if (raw != null) {
        runInAction(() => {
          this.data = raw as CurrencyRatesData
        })
      }
    }
    catch (error) {
      notifyError("Failed to load currency cache", error)
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      if (this.data) {
        await window.api.setKvCache("currency:rates", JSON.parse(JSON.stringify(this.data)))
      }
    }
    catch (error) {
      notifyError("Failed to save currency cache", error)
    }
  }

  createFetchRatesTask(): FetchTask {
    return {
      label: "Currency rates",
      execute: async () => {
        const data = await window.api.fetchCurrencyRates()
        runInAction(() => {
          this.data = data as CurrencyRatesData
        })
        await this.saveToCache()
      },
    }
  }
}
