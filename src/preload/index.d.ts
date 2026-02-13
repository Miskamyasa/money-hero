import type { ElectronAPI } from "@electron-toolkit/preload"

export interface GoldQuote {
  price: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  symbol: string
}

export interface Api {
  fetchGoldQuote: () => Promise<GoldQuote>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
