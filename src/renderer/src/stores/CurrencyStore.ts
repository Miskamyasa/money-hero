import {makeAutoObservable, runInAction} from "mobx"

import {notifyError} from "../utils/notify"

import type {FetchTask} from "./FetchQueueStore"
import type {RootStore} from "./RootStore"

type CurrencyRate = {
  symbol: string,
  label: string,
  rate: number,
  changePercent: number,
  hidden: boolean,
}

type DollarIndex = {
  value: number,
  changePercent: number,
}

type CurrencyRatesData = {
  dollar: DollarIndex,
  currencies: CurrencyRate[],
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

  getRate(label: string): number | null {
    return this.data?.currencies.find(c => c.label === label)?.rate ?? null
  }

  convertToIls(value: number, fromCurrency: string): number | null {
    if (value === 0)
      return 0

    const ilsRate = this.getRate("ILS")
    if (ilsRate == null)
      return null

    if (fromCurrency === "ILS")
      return value

    if (fromCurrency === "USD")
      return value * ilsRate

    const fromRate = this.getRate(fromCurrency)
    if (fromRate == null)
      return null

    // fromCurrency → USD → ILS
    return (value / fromRate) * ilsRate
  }

  convertToUsd(value: number, fromCurrency: string): number | null {
    if (value === 0)
      return 0

    if (fromCurrency === "USD")
      return value

    const fromRate = this.getRate(fromCurrency)
    if (fromRate == null)
      return null

    return value / fromRate
  }

  createFetchRatesTask(): FetchTask {
    return {
      label: "Currency rates",
      execute: async () => {
        const data = await window.api.fetchCurrencyRates()
        runInAction(() => {
          this.data = data
        })
        await this.saveToCache()
      },
    }
  }
}
