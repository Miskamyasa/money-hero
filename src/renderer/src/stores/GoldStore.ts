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

type GoldHistory = {
  change1m: number | null,
  change6m: number | null,
  change2y: number | null,
}

export class GoldStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  quote: GoldQuote | null = null
  history: GoldHistory | null = null

  get rootStore(): RootStore {
    return this.root
  }

  async loadFromCache(): Promise<void> {
    try {
      const [quoteRaw, historyRaw] = await Promise.all([
        window.api.getKvCache("gold:quote"),
        window.api.getKvCache("gold:history"),
      ])
      runInAction(() => {
        if (quoteRaw != null) {
          this.quote = quoteRaw as GoldQuote
        }
        if (historyRaw != null) {
          this.history = historyRaw as GoldHistory
        }
      })
    }
    catch (error) {
      notifyError("Failed to load gold cache", error)
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      const promises: Promise<void>[] = []
      if (this.quote) {
        promises.push(window.api.setKvCache("gold:quote", JSON.parse(JSON.stringify(this.quote))))
      }
      if (this.history) {
        promises.push(window.api.setKvCache("gold:history", JSON.parse(JSON.stringify(this.history))))
      }
      await Promise.all(promises)
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

  createFetchHistoryTask(): FetchTask {
    return {
      label: "Gold history",
      execute: async () => {
        const data = await window.api.fetchGoldHistory()
        runInAction(() => {
          this.history = data as GoldHistory
        })
        await this.saveToCache()
      },
    }
  }
}
