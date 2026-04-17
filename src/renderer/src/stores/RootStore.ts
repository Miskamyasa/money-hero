import {DIVIDEND_ARISTOCRATS, HIGH_YIELD, WATER} from "@renderer/config/stockUniverses"

import {AMOUNT_SCOPE_STOCK_HOLDINGS} from "../../../shared/amountScopes"

import {AppStore} from "./AppStore"
import {BalanceStore} from "./BalanceStore"
import {CurrencyStore} from "./CurrencyStore"
import {FetchQueueStore} from "./FetchQueueStore"
import {GoldStore} from "./GoldStore"
import {StockAmountsStore} from "./StockAmountsStore"
import {StocksStore} from "./StocksStore"
import {SymbolStore} from "./SymbolStore"
import {ThemeStore} from "./ThemeStore"

const AUTO_REFRESH_INTERVAL = 20 * 60 * 1000 // 20 minutes

export class RootStore {
  constructor() {
    this.fetchQueue = new FetchQueueStore()
    this.app = new AppStore(this)
    this.currency = new CurrencyStore(this)
    this.gold = new GoldStore(this)
    this.stockAmounts = new StockAmountsStore(AMOUNT_SCOPE_STOCK_HOLDINGS)
    this.water = new StocksStore(this, WATER, "water")
    this.highYield = new StocksStore(this, HIGH_YIELD, "high-yield")
    this.aristocrats = new StocksStore(this, DIVIDEND_ARISTOCRATS, "aristocrats")
    this.theme = new ThemeStore(this)
    this.vwra = new SymbolStore(this, "VWRA.L")
    this.voo = new SymbolStore(this, "VOO")
    this.balance = new BalanceStore(this)
  }

  readonly fetchQueue: FetchQueueStore
  readonly app: AppStore
  readonly balance: BalanceStore
  readonly currency: CurrencyStore
  readonly gold: GoldStore
  readonly stockAmounts: StockAmountsStore
  readonly aristocrats: StocksStore
  readonly highYield: StocksStore
  readonly water: StocksStore
  readonly theme: ThemeStore
  readonly vwra: SymbolStore
  readonly voo: SymbolStore

  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null
  private lastRefreshAt = 0

  startAutoRefresh(): void {
    this.stopAutoRefresh()
    this.autoRefreshTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastRefreshAt
      if (elapsed < AUTO_REFRESH_INTERVAL) {
        return
      }
      this.refreshAll()
    }, AUTO_REFRESH_INTERVAL)
  }

  stopAutoRefresh(): void {
    if (this.autoRefreshTimer != null) {
      clearInterval(this.autoRefreshTimer)
      this.autoRefreshTimer = null
    }
  }

  fetchStartupItems(): void {
    this.lastRefreshAt = Date.now()
    this.fetchQueue.enqueue([
      this.currency.createFetchRatesTask(),
      this.gold.createFetchQuoteTask(),
      this.gold.createFetchHistoryTask(),
      this.vwra.createFetchQuoteTask(),
      this.voo.createFetchQuoteTask(),
    ])
  }

  refreshAll(): void {
    this.lastRefreshAt = Date.now()
    this.fetchQueue.clear()
    this.fetchQueue.enqueue([
      this.currency.createFetchRatesTask(),
      this.gold.createFetchQuoteTask(),
      this.gold.createFetchHistoryTask(),
      this.vwra.createFetchQuoteTask(),
      this.voo.createFetchQuoteTask(),
      ...this.aristocrats.data.createFetchTasks(),
      this.aristocrats.data.createFlushCacheTask(),
      ...this.highYield.data.createFetchTasks(),
      this.highYield.data.createFlushCacheTask(),
      ...this.water.data.createFetchTasks(),
      this.water.data.createFlushCacheTask(),
    ])
  }

  loadStocks(store: StocksStore): void {
    this.fetchQueue.enqueue([
      ...store.data.createFetchTasks(),
      store.data.createFlushCacheTask(),
    ])
  }
}
