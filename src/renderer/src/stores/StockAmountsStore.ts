import { notifyError } from "@renderer/utils/notify"
import { makeAutoObservable, runInAction } from "mobx"
import { AMOUNT_SCOPE_STOCK_HOLDINGS } from "../../../shared/amountScopes"

const PERSIST_DEBOUNCE_MS = 400

export class StockAmountsStore {
  amounts = new Map<string, number>()

  private amountWriteVersion = new Map<string, number>()
  private amountPersistTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private persistedAmounts = new Map<string, number>()
  private loadPromise: Promise<void> | null = null
  private loaded = false

  constructor(private amountScope: string = AMOUNT_SCOPE_STOCK_HOLDINGS) {
    makeAutoObservable(this)
  }

  getAmount(symbol: string): number {
    return this.amounts.get(symbol) ?? 0
  }

  setAmount(symbol: string, value: number): void {
    this.amounts.set(symbol, value)
    const writeVersion = (this.amountWriteVersion.get(symbol) ?? 0) + 1
    this.amountWriteVersion.set(symbol, writeVersion)

    const pendingTimer = this.amountPersistTimers.get(symbol)
    if (pendingTimer) {
      clearTimeout(pendingTimer)
    }

    const nextTimer = setTimeout(() => {
      this.amountPersistTimers.delete(symbol)
      void this.persistAmount(symbol, value, writeVersion)
    }, PERSIST_DEBOUNCE_MS)
    this.amountPersistTimers.set(symbol, nextTimer)
  }

  private async persistAmount(symbol: string, value: number, writeVersion: number): Promise<void> {
    try {
      await window.api.setScopedStockAmount(this.amountScope, symbol, value)
      if (this.amountWriteVersion.get(symbol) !== writeVersion)
        return

      runInAction(() => {
        this.persistedAmounts.set(symbol, value)
      })
    }
    catch (error) {
      if (this.amountWriteVersion.get(symbol) !== writeVersion)
        return

      const rollbackValue = this.persistedAmounts.get(symbol) ?? 0
      runInAction(() => {
        this.amounts.set(symbol, rollbackValue)
      })
      notifyError(`Failed to save amount for ${symbol}`, error)
    }
  }

  async loadAmounts(): Promise<void> {
    if (this.loaded) {
      return
    }

    if (this.loadPromise) {
      return this.loadPromise
    }

    const runPromise = (async () => {
      try {
        const amounts = await window.api.getScopedStockAmounts(this.amountScope)
        runInAction(() => {
          for (const [symbol, amount] of Object.entries(amounts)) {
            this.amounts.set(symbol, amount)
            this.persistedAmounts.set(symbol, amount)
          }
          this.loaded = true
        })
      }
      catch (error) {
        notifyError("Failed to load stock amounts", error)
      }
    })()

    this.loadPromise = runPromise
    try {
      await runPromise
    }
    finally {
      if (this.loadPromise === runPromise) {
        this.loadPromise = null
      }
    }
  }
}
