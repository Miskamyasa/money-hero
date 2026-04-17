import {FUNDS_ETFS, INDIVIDUAL_STOCKS} from "@renderer/config/stockUniverses"

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
  fetchQueue = new FetchQueueStore()
  app = new AppStore(this)
  currency = new CurrencyStore(this)
  gold = new GoldStore(this)
  stockAmounts = new StockAmountsStore(AMOUNT_SCOPE_STOCK_HOLDINGS)
  fundsEtfs = new StocksStore(this, FUNDS_ETFS, "funds-etfs")
  individualStocks = new StocksStore(this, INDIVIDUAL_STOCKS, "individual-stocks")
  // water = new StocksStore(this, WATER, "water")
  // highYield = new StocksStore(this, HIGH_YIELD, "high-yield")
  // aristocrats = new StocksStore(this, DIVIDEND_ARISTOCRATS, "aristocrats")
  theme = new ThemeStore(this)
  vwra = new SymbolStore(this, "VWRA.L")
  igln = new SymbolStore(this, "IGLN.L")
  tase = new SymbolStore(this, "MORE-S7.TA")
  copx = new SymbolStore(this, "COPX")
  psi = new SymbolStore(this, "PSI")
  healL = new SymbolStore(this, "HEAL.L")
  balance = new BalanceStore(this)

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
      this.vwra.createFetchQuoteTask(),
      this.igln.createFetchQuoteTask(),
      this.tase.createFetchQuoteTask(),
      this.copx.createFetchQuoteTask(),
      this.psi.createFetchQuoteTask(),
      this.healL.createFetchQuoteTask(),
    ])
  }

  refreshAll(): void {
    this.lastRefreshAt = Date.now()
    this.fetchQueue.clear()
    this.fetchQueue.enqueue([
      this.currency.createFetchRatesTask(),
      this.gold.createFetchQuoteTask(),
      this.vwra.createFetchQuoteTask(),
      this.igln.createFetchQuoteTask(),
      this.tase.createFetchQuoteTask(),
      this.copx.createFetchQuoteTask(),
      this.psi.createFetchQuoteTask(),
      this.healL.createFetchQuoteTask(),
      ...this.fundsEtfs.data.createFetchTasks(),
      this.fundsEtfs.data.createFlushCacheTask(),
      ...this.individualStocks.data.createFetchTasks(),
      this.individualStocks.data.createFlushCacheTask(),
      // ...this.aristocrats.data.createFetchTasks(),
      // this.aristocrats.data.createFlushCacheTask(),
      // ...this.highYield.data.createFetchTasks(),
      // this.highYield.data.createFlushCacheTask(),
      // ...this.water.data.createFetchTasks(),
      // this.water.data.createFlushCacheTask(),
    ])
  }

  loadStocks(store: StocksStore): void {
    this.fetchQueue.enqueue([
      ...store.data.createFetchTasks(),
      store.data.createFlushCacheTask(),
    ])
  }
}
