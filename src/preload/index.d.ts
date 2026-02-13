import type { ElectronAPI } from "@electron-toolkit/preload"
import type { StockQuote } from "../shared/stocks"

export interface GoldQuote {
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  symbol: string
}

export interface GoldHistory {
  change1m: number | null
  change6m: number | null
  change2y: number | null
}

export interface CurrencyRate {
  symbol: string
  label: string
  rate: number
  changePercent: number
}

export interface DollarIndex {
  value: number
  changePercent: number
}

export interface CurrencyRates {
  dollar: DollarIndex
  currencies: CurrencyRate[]
}

export interface Api {
  fetchCurrencyRates: () => Promise<CurrencyRates>
  fetchGoldQuote: () => Promise<GoldQuote>
  fetchGoldHistory: () => Promise<GoldHistory>
  fetchStockQuote: (symbol: string) => Promise<StockQuote>
  getStockCache: (symbols: string[]) => Promise<StockQuote[]>
  saveStockCache: (quotes: StockQuote[]) => Promise<void>
  clearStockCache: (symbols: string[]) => Promise<void>
  getStockAmounts: () => Promise<Record<string, number>>
  setStockAmount: (symbol: string, amount: number) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
