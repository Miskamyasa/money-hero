import type {ElectronAPI} from "@electron-toolkit/preload"

import type {StockQuote} from "../shared/stocks"

export type GoldQuote = {
  price: number,
  previousClose: number,
  change: number,
  changePercent: number,
  currency: string,
  symbol: string,
}

export type CurrencyRate = {
  symbol: string,
  label: string,
  rate: number,
  changePercent: number,
  hidden: boolean,
}

export type DollarIndex = {
  value: number,
  changePercent: number,
}

export type CurrencyRates = {
  dollar: DollarIndex,
  currencies: CurrencyRate[],
}

export type Api = {
  fetchCurrencyRates: () => Promise<CurrencyRates>,
  fetchGoldQuote: () => Promise<GoldQuote>,
  fetchStockQuote: (symbol: string) => Promise<StockQuote>,
  getStockCache: (symbols: string[]) => Promise<StockQuote[]>,
  saveStockCache: (quotes: StockQuote[]) => Promise<void>,
  clearStockCache: (symbols: string[]) => Promise<void>,
  getStockAmounts: () => Promise<Record<string, number>>,
  setStockAmount: (symbol: string, amount: number) => Promise<void>,
  getScopedStockAmounts: (scope: string) => Promise<Record<string, number>>,
  setScopedStockAmount: (scope: string, symbol: string, amount: number) => Promise<void>,
  getScopedStockTargetWeights: (scope: string) => Promise<Record<string, number>>,
  setScopedStockTargetWeight: (scope: string, symbol: string, weight: number) => Promise<void>,
  getDisabledStockSymbols: (storageKey: string) => Promise<string[]>,
  setDisabledStockSymbols: (storageKey: string, symbols: string[]) => Promise<void>,
  getKvCache: (key: string) => Promise<unknown>,
  setKvCache: (key: string, value: unknown) => Promise<void>,
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface required for Window merging
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
