import type { StockQuote } from "../shared/stocks"

import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"
import { parseStockAmounts, parseStockQuote, parseStockQuotes } from "../shared/stocks"

// Custom APIs for renderer
const api = {
  fetchCurrencyRates: (): Promise<unknown> => ipcRenderer.invoke("currency:fetch-rates"),
  fetchGoldQuote: (): Promise<unknown> => ipcRenderer.invoke("gold:fetch-quote"),
  fetchGoldHistory: (): Promise<unknown> => ipcRenderer.invoke("gold:fetch-history"),
  fetchStockQuote: async (symbol: string): Promise<StockQuote> => {
    const payload = await ipcRenderer.invoke("stock:fetch-quote", symbol)
    try {
      return parseStockQuote(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for stock:fetch-quote: ${message}`)
    }
  },
  getStockCache: async (symbols: string[]): Promise<StockQuote[]> => {
    const payload = await ipcRenderer.invoke("db:get-stock-cache", symbols)
    try {
      return parseStockQuotes(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-stock-cache: ${message}`)
    }
  },
  saveStockCache: async (quotes: StockQuote[]): Promise<void> => {
    try {
      parseStockQuotes(quotes)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:save-stock-cache request: ${message}`)
    }
    await ipcRenderer.invoke("db:save-stock-cache", quotes)
  },
  clearStockCache: (symbols: string[]): Promise<void> => ipcRenderer.invoke("db:clear-stock-cache", symbols),
  getStockAmounts: async (): Promise<Record<string, number>> => {
    const payload = await ipcRenderer.invoke("db:get-stock-amounts")
    try {
      return parseStockAmounts(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-stock-amounts: ${message}`)
    }
  },
  setStockAmount: (symbol: string, amount: number): Promise<unknown> => ipcRenderer.invoke("db:set-stock-amount", symbol, amount),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  }
  catch (error) {
    console.error(error)
  }
}
else {
  // @ts-expect-error ts(2551)
  window.electron = electronAPI
  // @ts-expect-error ts(2551)
  window.api = api
}
