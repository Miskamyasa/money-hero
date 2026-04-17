import {makeAutoObservable, runInAction} from "mobx"

import {notifyError} from "@renderer/utils/notify"

import {AMOUNT_SCOPE_STOCK_TARGET_WEIGHTS} from "../../../shared/amountScopes"

const PERSIST_DEBOUNCE_MS = 400

export class StockTargetWeightsStore {
  weights = new Map<string, number>()

  private writeVersion = new Map<string, number>()
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private persistedWeights = new Map<string, number>()
  private loadPromise: Promise<void> | null = null
  private loaded = false

  constructor(private scope: string = AMOUNT_SCOPE_STOCK_TARGET_WEIGHTS) {
    makeAutoObservable(this)
  }

  getWeight(symbol: string): number {
    return this.weights.get(symbol) ?? 0
  }

  hasWeight(symbol: string): boolean {
    return this.weights.has(symbol)
  }

  setWeight(symbol: string, value: number): void {
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      return
    }

    this.weights.set(symbol, value)
    const writeVersion = (this.writeVersion.get(symbol) ?? 0) + 1
    this.writeVersion.set(symbol, writeVersion)

    const pendingTimer = this.persistTimers.get(symbol)
    if (pendingTimer) {
      clearTimeout(pendingTimer)
    }

    const nextTimer = setTimeout(() => {
      this.persistTimers.delete(symbol)
      void this.persistWeight(symbol, value, writeVersion)
    }, PERSIST_DEBOUNCE_MS)
    this.persistTimers.set(symbol, nextTimer)
  }

  private async persistWeight(symbol: string, value: number, writeVersion: number): Promise<void> {
    try {
      await window.api.setScopedStockTargetWeight(this.scope, symbol, value)
      if (this.writeVersion.get(symbol) !== writeVersion)
        return

      runInAction(() => {
        this.persistedWeights.set(symbol, value)
      })
    }
    catch (error) {
      if (this.writeVersion.get(symbol) !== writeVersion)
        return

      const rollbackValue = this.persistedWeights.get(symbol)
      runInAction(() => {
        if (rollbackValue == null) {
          this.weights.delete(symbol)
        }
        else {
          this.weights.set(symbol, rollbackValue)
        }
      })
      notifyError(`Failed to save target weight for ${symbol}`, error)
    }
  }

  async loadWeights(): Promise<void> {
    if (this.loaded) {
      return
    }

    if (this.loadPromise) {
      return this.loadPromise
    }

    const runPromise = (async () => {
      try {
        const weights = await window.api.getScopedStockTargetWeights(this.scope)
        runInAction(() => {
          for (const [symbol, weight] of Object.entries(weights)) {
            this.weights.set(symbol, weight)
            this.persistedWeights.set(symbol, weight)
          }
          this.loaded = true
        })
      }
      catch (error) {
        notifyError("Failed to load target weights", error)
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
