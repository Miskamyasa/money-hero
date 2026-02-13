import type { RootStore } from "./RootStore"

import { makeAutoObservable } from "mobx"

import { StocksAllocationStore } from "./stocks/StocksAllocationStore"
import { StocksDataStore } from "./stocks/StocksDataStore"
import { StocksUiStore } from "./stocks/StocksUiStore"

export class StocksStore {
  private symbols: string[]
  readonly data: StocksDataStore
  readonly ui: StocksUiStore
  readonly allocation: StocksAllocationStore

  constructor(private root: RootStore, symbols: string[], storageKey: string = "default") {
    this.symbols = symbols
    this.data = new StocksDataStore(root, symbols)
    this.ui = new StocksUiStore(storageKey)
    this.allocation = new StocksAllocationStore(this.data, this.ui)
    makeAutoObservable(this)
  }

  get rootStore(): RootStore {
    return this.root
  }

  get allSymbols(): string[] {
    return this.symbols
  }

  get activeQuotes() {
    return Array.from(this.data.quotes.values()).filter(q => !this.ui.disabledSymbols.has(q.symbol))
  }
}
