import type { RootStore } from "./RootStore"

import { makeAutoObservable, runInAction } from "mobx"

import { notifyError } from "../utils/notify"

const SYMBOL_WIDGET_AMOUNT_SCOPE = "symbol-widget"

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
    void window.api.setScopedStockAmount(SYMBOL_WIDGET_AMOUNT_SCOPE, this.symbol, value).catch((error) => {
      notifyError(`Failed to save amount for ${this.symbol}`, error)
    })
  }

  async loadAmount(): Promise<void> {
    try {
      const amounts = await window.api.getScopedStockAmounts(SYMBOL_WIDGET_AMOUNT_SCOPE)
      runInAction(() => {
        this.amount = amounts[this.symbol] ?? 0
      })
    }
    catch (error) {
      notifyError(`Failed to load amount for ${this.symbol}`, error)
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
      notifyError(`Failed to fetch ${this.symbol} quote`, error)
    }
  }
}
