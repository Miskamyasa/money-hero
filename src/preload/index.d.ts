import type { ElectronAPI } from "@electron-toolkit/preload"

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

export interface StockQuote {
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

export interface Api {
  fetchGoldQuote: () => Promise<GoldQuote>
  fetchGoldHistory: () => Promise<GoldHistory>
  fetchStockQuote: (symbol: string) => Promise<StockQuote>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
