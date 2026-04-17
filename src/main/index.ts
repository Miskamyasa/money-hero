import {join} from "node:path"

import {electronApp, is, optimizer} from "@electron-toolkit/utils"
import {app, BrowserWindow, ipcMain, shell} from "electron"

import icon from "../../resources/icon.png?asset"
import type {StockQuote} from "../shared/stocks"

import {CURRENCY_IPC_CHANNEL, fetchCurrencyRates} from "./currency"
import {initDatabase} from "./database"
import {fetchGoldQuote, GOLD_IPC_CHANNEL} from "./gold"
import {
  clearStockQuotesCache,
  getDisabledStockSymbols,
  getKvCache,
  getScopedStockAmounts,
  getScopedStockTargetWeights,
  getStockAmounts,
  getStockQuotesCache,
  saveStockQuotesCache,
  setDisabledStockSymbols,
  setKvCache,
  setScopedStockAmount,
  setScopedStockTargetWeight,
  setStockAmount,
} from "./repositories"
import {fetchStockQuote, STOCK_IPC_CHANNEL} from "./stocks"

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? {icon} : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return {action: "deny"}
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  }
  else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
void app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron")

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on("ping", () => {
    console.warn("pong")
  })
  ipcMain.handle(GOLD_IPC_CHANNEL, fetchGoldQuote)
  ipcMain.handle(STOCK_IPC_CHANNEL, (_event, symbol: string) => fetchStockQuote(symbol))
  ipcMain.handle(CURRENCY_IPC_CHANNEL, fetchCurrencyRates)

  // Database IPC handlers
  ipcMain.handle("db:get-stock-cache", (_event, symbols: string[]) => getStockQuotesCache(symbols))
  ipcMain.handle("db:save-stock-cache", (_event, quotes: StockQuote[]) => saveStockQuotesCache(quotes))
  ipcMain.handle("db:clear-stock-cache", (_event, symbols: string[]) => clearStockQuotesCache(symbols))
  ipcMain.handle("db:get-stock-amounts", () => getStockAmounts())
  ipcMain.handle("db:set-stock-amount", (_event, symbol: string, amount: number) => setStockAmount(symbol, amount))
  ipcMain.handle("db:get-scoped-stock-amounts", (_event, scope: string) => getScopedStockAmounts(scope))
  ipcMain.handle(
    "db:set-scoped-stock-amount",
    (_event, scope: string, symbol: string, amount: number) => setScopedStockAmount(scope, symbol, amount),
  )
  ipcMain.handle(
    "db:get-scoped-stock-target-weights",
    (_event, scope: string) => getScopedStockTargetWeights(scope),
  )
  ipcMain.handle(
    "db:set-scoped-stock-target-weight",
    (_event, scope: string, symbol: string, weight: number) => {
      if (typeof scope !== "string" || scope.length === 0) {
        throw new TypeError("scope must be a non-empty string")
      }
      if (typeof symbol !== "string" || symbol.length === 0) {
        throw new TypeError("symbol must be a non-empty string")
      }
      if (!Number.isInteger(weight) || weight < 1 || weight > 100) {
        throw new TypeError("weight must be an integer between 1 and 100")
      }
      return setScopedStockTargetWeight(scope, symbol, weight)
    },
  )
  ipcMain.handle("db:get-disabled-stock-symbols", (_event, storageKey: string) => getDisabledStockSymbols(storageKey))
  ipcMain.handle(
    "db:set-disabled-stock-symbols",
    (_event, storageKey: string, symbols: string[]) => setDisabledStockSymbols(storageKey, symbols),
  )
  ipcMain.handle("db:get-kv-cache", (_event, key: string) => getKvCache(key))
  ipcMain.handle("db:set-kv-cache", (_event, key: string, value: unknown) => setKvCache(key, value))

  await initDatabase()

  createWindow()

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
