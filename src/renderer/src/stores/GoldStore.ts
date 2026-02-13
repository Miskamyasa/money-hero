import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

import { notifyError } from "../utils/notify"

const GOLD_AMOUNT_SCOPE = "gold"

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
  loading = false
  error: string | null = null

  history: GoldHistory | null = null
  historyLoading = false
  historyError: string | null = null

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
    void window.api.setScopedStockAmount(GOLD_AMOUNT_SCOPE, "GC=F", value).catch((error) => {
      notifyError("Failed to save gold amount", error)
    })
  }

  async loadAmount(): Promise<void> {
    try {
      const amounts = await window.api.getScopedStockAmounts(GOLD_AMOUNT_SCOPE)
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
      notifyError("Failed to fetch gold quote", error)
    }
  }

  async fetchHistory(): Promise<void> {
    this.historyLoading = true
    this.historyError = null
    try {
      const data = await window.api.fetchGoldHistory()
      runInAction(() => {
        this.history = data as GoldHistory
        this.historyLoading = false
      })
    }
    catch (error) {
      runInAction(() => {
        this.historyError = error instanceof Error ? error.message : "Failed to fetch gold history"
        this.historyLoading = false
      })
      notifyError("Failed to fetch gold history", error)
    }
  }
}
