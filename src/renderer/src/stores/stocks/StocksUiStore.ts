import { notifyError } from "@renderer/utils/notify"
import { makeAutoObservable, runInAction } from "mobx"

export class StocksUiStore {
  editingSymbol: string | null = null
  buyingMode = false
  investmentAmount = 0
  disabledSymbols = new Set<string>()

  private persistVersion = 0

  constructor(private storageKey: string, symbols: string[]) {
    this.allowedSymbols = new Set(symbols)
    makeAutoObservable(this)
  }

  private allowedSymbols: Set<string>

  startEditing(symbol: string): void {
    this.editingSymbol = symbol
  }

  stopEditing(): void {
    this.editingSymbol = null
  }

  isEditing(symbol: string): boolean {
    return this.editingSymbol === symbol
  }

  toggleSymbol(symbol: string): void {
    if (!this.allowedSymbols.has(symbol)) {
      return
    }

    const previousSymbols = new Set(this.disabledSymbols)
    if (this.disabledSymbols.has(symbol)) {
      this.disabledSymbols.delete(symbol)
    }
    else {
      this.disabledSymbols.add(symbol)
    }
    const writeVersion = ++this.persistVersion
    void this.saveDisabledSymbols(writeVersion, previousSymbols)
  }

  isSymbolEnabled(symbol: string): boolean {
    return !this.disabledSymbols.has(symbol)
  }

  toggleBuyingMode(): void {
    this.buyingMode = !this.buyingMode
    if (!this.buyingMode) {
      this.investmentAmount = 0
    }
  }

  setInvestmentAmount(amount: number): void {
    this.investmentAmount = amount
  }

  async loadDisabledSymbols(): Promise<void> {
    try {
      const symbols = await window.api.getDisabledStockSymbols(this.storageKey)
      const filteredSymbols = symbols.filter(symbol => this.allowedSymbols.has(symbol))
      runInAction(() => {
        this.disabledSymbols = new Set(filteredSymbols)
      })
    }
    catch (error) {
      notifyError("Failed to load disabled stocks", error)
    }
  }

  private async saveDisabledSymbols(writeVersion: number, previousSymbols: Set<string>): Promise<void> {
    try {
      await window.api.setDisabledStockSymbols(this.storageKey, Array.from(this.disabledSymbols))
    }
    catch (error) {
      if (this.persistVersion !== writeVersion) {
        return
      }

      runInAction(() => {
        this.disabledSymbols = previousSymbols
      })
      notifyError("Failed to save disabled stocks", error)
    }
  }
}
