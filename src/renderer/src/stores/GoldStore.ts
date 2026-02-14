import type { FetchTask } from "./FetchQueueStore"
import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"
import { AMOUNT_SCOPE_GOLD } from "../../../shared/amountScopes"

import { notifyError } from "../utils/notify"

interface GoldQuote {
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  symbol: string
}

interface GoldHistory {
  change1m: number | null
  change6m: number | null
  change2y: number | null
}

export class GoldStore {
  constructor(private root: RootStore) {
    makeAutoObservable(this)
  }

  quote: GoldQuote | null = null
  history: GoldHistory | null = null

  amount = 0
  editingAmount = false

  get rootStore(): RootStore {
    return this.root
  }

  get balance(): number {
    return this.amount * (this.quote?.price ?? 0)
  }

  setAmount(value: number): void {
    this.amount = value
    void window.api.setScopedStockAmount(AMOUNT_SCOPE_GOLD, "GC=F", value).catch((error) => {
      notifyError("Failed to save gold amount", error)
    })
  }

  async loadAmount(): Promise<void> {
    try {
      const amounts = await window.api.getScopedStockAmounts(AMOUNT_SCOPE_GOLD)
      runInAction(() => {
        this.amount = amounts["GC=F"] ?? 0
      })
    }
    catch (error) {
      notifyError("Failed to load gold amount", error)
    }
  }

  startEditing(): void {
    this.editingAmount = true
  }

  stopEditing(): void {
    this.editingAmount = false
  }

  createFetchQuoteTask(): FetchTask {
    return {
      label: "Gold quote",
      execute: async () => {
        const data = await window.api.fetchGoldQuote()
        runInAction(() => {
          this.quote = data as GoldQuote
        })
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
      },
    }
  }
}
