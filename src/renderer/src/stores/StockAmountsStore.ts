import { notifyError } from "@renderer/utils/notify"
import { makeAutoObservable, runInAction } from "mobx"

export class StockAmountsStore {
  amounts = new Map<string, number>()

  private amountWriteVersion = new Map<string, number>()
  private loadPromise: Promise<void> | null = null
  private loaded = false

  constructor() {
    makeAutoObservable(this)
  }

  getAmount(symbol: string): number {
    return this.amounts.get(symbol) ?? 0
  }

  setAmount(symbol: string, value: number): void {
    const previousValue = this.getAmount(symbol)
    this.amounts.set(symbol, value)
    const writeVersion = (this.amountWriteVersion.get(symbol) ?? 0) + 1
    this.amountWriteVersion.set(symbol, writeVersion)

    void window.api.setStockAmount(symbol, value).catch((error) => {
      if (this.amountWriteVersion.get(symbol) !== writeVersion)
        return

      runInAction(() => {
        this.amounts.set(symbol, previousValue)
      })
      notifyError(`Failed to save amount for ${symbol}`, error)
    })
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
        const amounts = await window.api.getStockAmounts()
        runInAction(() => {
          for (const [symbol, amount] of Object.entries(amounts)) {
            this.amounts.set(symbol, amount)
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
