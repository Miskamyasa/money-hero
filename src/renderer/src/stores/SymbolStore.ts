import {makeAutoObservable, runInAction} from "mobx"

import {AMOUNT_SCOPE_SYMBOL_WIDGET} from "../../../shared/amountScopes"
import {notifyError} from "../utils/notify"

import type {FetchTask} from "./FetchQueueStore"
import type {RootStore} from "./RootStore"

type SymbolQuote = {
  symbol: string,
  name: string,
  price: number,
  previousClose: number,
  change: number,
  changePercent: number,
  currency: string,
  change1m: number | null,
  change6m: number | null,
  change2y: number | null,
}

export class SymbolStore {
  constructor(private root: RootStore, readonly symbol: string) {
    makeAutoObservable(this)
  }

  quote: SymbolQuote | null = null
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
    void window.api.setScopedStockAmount(AMOUNT_SCOPE_SYMBOL_WIDGET, this.symbol, value).catch((error: unknown) => {
      notifyError(`Failed to save amount for ${this.symbol}`, error)
    })
  }

  async loadAmount(): Promise<void> {
    try {
      const amounts = await window.api.getScopedStockAmounts(AMOUNT_SCOPE_SYMBOL_WIDGET)
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

  async loadFromCache(): Promise<void> {
    try {
      const raw = await window.api.getKvCache(`symbol:${this.symbol}`)
      if (raw != null) {
        runInAction(() => {
          this.quote = raw as SymbolQuote
        })
      }
    }
    catch (error) {
      notifyError(`Failed to load ${this.symbol} cache`, error)
    }
  }

  private async saveToCache(): Promise<void> {
    try {
      if (this.quote) {
        await window.api.setKvCache(`symbol:${this.symbol}`, JSON.parse(JSON.stringify(this.quote)))
      }
    }
    catch (error) {
      notifyError(`Failed to save ${this.symbol} cache`, error)
    }
  }

  createFetchQuoteTask(): FetchTask {
    return {
      label: `${this.symbol} quote`,
      execute: async () => {
        const data = await window.api.fetchStockQuote(this.symbol)
        runInAction(() => {
          this.quote = data as SymbolQuote
        })
        await this.saveToCache()
      },
    }
  }
}
