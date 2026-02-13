import { notifyError } from "@renderer/utils/notify"
import { makeAutoObservable } from "mobx"

export class StocksUiStore {
  editingSymbol: string | null = null
  buyingMode = false
  investmentAmount = 0
  disabledSymbols = new Set<string>()

  constructor(private storageKey: string) {
    makeAutoObservable(this)
  }

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
    if (this.disabledSymbols.has(symbol)) {
      this.disabledSymbols.delete(symbol)
    }
    else {
      this.disabledSymbols.add(symbol)
    }
    this.saveDisabledSymbols()
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

  loadDisabledSymbols(): void {
    const key = `money-hero-disabled-stocks-${this.storageKey}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const array = JSON.parse(stored) as string[]
        this.disabledSymbols = new Set(array)
      }
      catch (error) {
        notifyError("Failed to load disabled stocks from localStorage", error)
      }
    }
  }

  private saveDisabledSymbols(): void {
    const key = `money-hero-disabled-stocks-${this.storageKey}`
    const array = Array.from(this.disabledSymbols)
    localStorage.setItem(key, JSON.stringify(array))
  }
}
