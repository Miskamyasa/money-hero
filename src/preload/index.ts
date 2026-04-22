import {electronAPI} from "@electron-toolkit/preload"
import {contextBridge, ipcRenderer} from "electron"

import type {StockQuote} from "../shared/stocks"
import {parseStockAmounts, parseStockQuote, parseStockQuotes, parseStockTargetWeights} from "../shared/stocks"

function parseStockSymbols(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new TypeError(`${label}[${index}] must be a string`)
    }
    return item
  })
}

function parseStorageKey(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`)
  }

  if (value.length === 0) {
    throw new TypeError(`${label} must not be empty`)
  }

  return value
}

function parseAmountScope(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string`)
  }

  if (value.length === 0) {
    throw new TypeError(`${label} must not be empty`)
  }

  return value
}

function parseStockAmountWrite(value: unknown): {symbol: string, amount: number} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("stock amount write payload must be an object")
  }

  const payload = value as {symbol?: unknown, amount?: unknown}
  if (typeof payload.symbol !== "string") {
    throw new TypeError("stock amount write payload.symbol must be a string")
  }
  if (typeof payload.amount !== "number" || !Number.isFinite(payload.amount)) {
    throw new TypeError("stock amount write payload.amount must be a finite number")
  }

  return {
    symbol: payload.symbol,
    amount: payload.amount,
  }
}

function parseStockTargetWeightWrite(value: unknown): {symbol: string, weight: number} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("stock target weight write payload must be an object")
  }

  const payload = value as {symbol?: unknown, weight?: unknown}
  if (typeof payload.symbol !== "string" || payload.symbol.length === 0) {
    throw new TypeError("stock target weight write payload.symbol must be a non-empty string")
  }
  if (
    typeof payload.weight !== "number"
    || !Number.isInteger(payload.weight)
    || payload.weight < 1
    || payload.weight > 100
  ) {
    throw new TypeError("stock target weight write payload.weight must be an integer between 1 and 100")
  }

  return {
    symbol: payload.symbol,
    weight: payload.weight,
  }
}

// Custom APIs for renderer
const api = {
  fetchCurrencyRates: (): Promise<unknown> => ipcRenderer.invoke("currency:fetch-rates"),
  fetchGoldQuote: (): Promise<unknown> => ipcRenderer.invoke("gold:fetch-quote"),
  fetchGoldHistory: (): Promise<unknown> => ipcRenderer.invoke("gold:fetch-history"),
  fetchStockQuote: async (symbol: string): Promise<StockQuote> => {
    const payload: unknown = await ipcRenderer.invoke("stock:fetch-quote", symbol)
    try {
      return parseStockQuote(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for stock:fetch-quote: ${message}`, {cause: error})
    }
  },
  getStockCache: async (symbols: string[]): Promise<StockQuote[]> => {
    const payload: unknown = await ipcRenderer.invoke("db:get-stock-cache", symbols)
    try {
      return parseStockQuotes(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-stock-cache: ${message}`, {cause: error})
    }
  },
  saveStockCache: async (quotes: StockQuote[]): Promise<void> => {
    try {
      parseStockQuotes(quotes)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:save-stock-cache request: ${message}`, {cause: error})
    }
    await ipcRenderer.invoke("db:save-stock-cache", quotes)
  },
  clearStockCache: (symbols: string[]): Promise<void> => {
    const parsedSymbols = parseStockSymbols(symbols, "clearStockCache symbols")
    return ipcRenderer.invoke("db:clear-stock-cache", parsedSymbols)
  },
  getStockAmounts: async (): Promise<Record<string, number>> => {
    const payload: unknown = await ipcRenderer.invoke("db:get-stock-amounts")
    try {
      return parseStockAmounts(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-stock-amounts: ${message}`, {cause: error})
    }
  },
  setStockAmount: (symbol: string, amount: number): Promise<void> => {
    const parsed = parseStockAmountWrite({symbol, amount})
    return ipcRenderer.invoke("db:set-stock-amount", parsed.symbol, parsed.amount)
  },
  getScopedStockAmounts: async (scope: string): Promise<Record<string, number>> => {
    const parsedScope = parseAmountScope(scope, "getScopedStockAmounts scope")
    const payload: unknown = await ipcRenderer.invoke("db:get-scoped-stock-amounts", parsedScope)
    try {
      return parseStockAmounts(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-scoped-stock-amounts: ${message}`, {cause: error})
    }
  },
  setScopedStockAmount: (scope: string, symbol: string, amount: number): Promise<void> => {
    const parsedScope = parseAmountScope(scope, "setScopedStockAmount scope")
    const parsed = parseStockAmountWrite({symbol, amount})
    return ipcRenderer.invoke("db:set-scoped-stock-amount", parsedScope, parsed.symbol, parsed.amount)
  },
  getScopedStockTargetWeights: async (scope: string): Promise<Record<string, number>> => {
    const parsedScope = parseAmountScope(scope, "getScopedStockTargetWeights scope")
    const payload: unknown = await ipcRenderer.invoke("db:get-scoped-stock-target-weights", parsedScope)
    try {
      return parseStockTargetWeights(payload)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-scoped-stock-target-weights: ${message}`, {cause: error})
    }
  },
  setScopedStockTargetWeight: (scope: string, symbol: string, weight: number): Promise<void> => {
    const parsedScope = parseAmountScope(scope, "setScopedStockTargetWeight scope")
    const parsed = parseStockTargetWeightWrite({symbol, weight})
    return ipcRenderer.invoke("db:set-scoped-stock-target-weight", parsedScope, parsed.symbol, parsed.weight)
  },
  getDisabledStockSymbols: async (storageKey: string): Promise<string[]> => {
    const parsedStorageKey = parseStorageKey(storageKey, "getDisabledStockSymbols storageKey")
    const payload: unknown = await ipcRenderer.invoke("db:get-disabled-stock-symbols", parsedStorageKey)
    try {
      return parseStockSymbols(payload, "db:get-disabled-stock-symbols payload")
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Unknown payload error"
      throw new Error(`Invalid IPC payload for db:get-disabled-stock-symbols: ${message}`, {cause: error})
    }
  },
  setDisabledStockSymbols: (storageKey: string, symbols: string[]): Promise<void> => {
    const parsedStorageKey = parseStorageKey(storageKey, "setDisabledStockSymbols storageKey")
    const parsedSymbols = parseStockSymbols(symbols, "setDisabledStockSymbols symbols")
    return ipcRenderer.invoke("db:set-disabled-stock-symbols", parsedStorageKey, parsedSymbols)
  },
  getKvCache: (key: string): Promise<unknown> => {
    return ipcRenderer.invoke("db:get-kv-cache", key)
  },
  setKvCache: (key: string, value: unknown): Promise<void> => {
    return ipcRenderer.invoke("db:set-kv-cache", key, value)
  },
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
  // @ts-expect-error ts(2551) window typings without contextIsolation
  window.electron = electronAPI
  // @ts-expect-error ts(2551) window typings without contextIsolation
  window.api = api
}
