import {makeAutoObservable, runInAction} from "mobx"

import {notifyError} from "../utils/notify"

import type {FetchTask} from "./FetchQueueStore"
import type {RootStore} from "./RootStore"

type GoldQuote = {
  price: number,
  previousClose: number,
  change: number,
  changePercent: number,
  currency: string,
  symbol: string,
}

export class GoldStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  quote: GoldQuote | null = null

  get rootStore(): RootStore {
    return this.root
  }

  async loadFromCache(): Promise<void> {
    try {
      const quoteRaw = await window.api.getKvCache("gold:quote")
      runInAction(() => {
        if (quoteRaw != null) {
          this.quote = quoteRaw as GoldQuote
        }
      })
    }
    catch (error) {
      notifyError("Failed to load gold cache", error)
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      if (this.quote) {
        await window.api.setKvCache("gold:quote", JSON.parse(JSON.stringify(this.quote)))
      }
    }
    catch (error) {
      notifyError("Failed to save gold cache", error)
    }
  }

  createFetchQuoteTask(): FetchTask {
    return {
      label: "Gold quote",
      execute: async () => {
        const data = await window.api.fetchGoldQuote()
        runInAction(() => {
          this.quote = data as GoldQuote
        })
        await this.saveToCache()
      },
    }
  }
}
