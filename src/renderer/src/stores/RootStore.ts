import { DIVIDEND_ARISTOCRATS, HIGH_YIELD, WATER } from "@renderer/config/stockUniverses"
import { AMOUNT_SCOPE_STOCK_HOLDINGS } from "../../../shared/amountScopes"

import { AppStore } from "./AppStore"
import { BalanceStore } from "./BalanceStore"
import { CurrencyStore } from "./CurrencyStore"
import { FetchQueueStore } from "./FetchQueueStore"
import { GoldStore } from "./GoldStore"
import { StockAmountsStore } from "./StockAmountsStore"
import { StocksStore } from "./StocksStore"
import { SymbolStore } from "./SymbolStore"
import { ThemeStore } from "./ThemeStore"

export class RootStore {
  constructor() {
    this.fetchQueue = new FetchQueueStore()
    this.app = new AppStore(this)
    this.currency = new CurrencyStore(this)
    this.gold = new GoldStore(this)
    this.stockAmounts = new StockAmountsStore(AMOUNT_SCOPE_STOCK_HOLDINGS)
    this.stocks = new StocksStore(this, DIVIDEND_ARISTOCRATS, "aristocrats")
    this.highYield = new StocksStore(this, HIGH_YIELD, "high-yield")
    this.water = new StocksStore(this, WATER, "water")
    this.theme = new ThemeStore(this)
    this.vt = new SymbolStore(this, "VT")
    this.voo = new SymbolStore(this, "VOO")
    this.balance = new BalanceStore(this)
  }

  readonly fetchQueue: FetchQueueStore
  readonly app: AppStore
  readonly balance: BalanceStore
  readonly currency: CurrencyStore
  readonly gold: GoldStore
  readonly stockAmounts: StockAmountsStore
  readonly stocks: StocksStore
  readonly highYield: StocksStore
  readonly water: StocksStore
  readonly theme: ThemeStore
  readonly vt: SymbolStore
  readonly voo: SymbolStore

  fetchStartupItems(): void {
    this.fetchQueue.enqueue([
      this.currency.createFetchRatesTask(),
      this.gold.createFetchQuoteTask(),
      this.gold.createFetchHistoryTask(),
      this.vt.createFetchQuoteTask(),
      this.voo.createFetchQuoteTask(),
    ])
  }

  refreshAll(): void {
    this.fetchQueue.clear()
    this.fetchQueue.enqueue([
      this.currency.createFetchRatesTask(),
      this.gold.createFetchQuoteTask(),
      this.gold.createFetchHistoryTask(),
      this.vt.createFetchQuoteTask(),
      this.voo.createFetchQuoteTask(),
      ...this.stocks.data.createFetchTasks(),
      this.stocks.data.createFlushCacheTask(),
      ...this.highYield.data.createFetchTasks(),
      this.highYield.data.createFlushCacheTask(),
      ...this.water.data.createFetchTasks(),
      this.water.data.createFlushCacheTask(),
    ])
  }

  loadStocks(store: StocksStore): void {
    this.fetchQueue.clear()
    this.fetchQueue.enqueue([
      ...store.data.createFetchTasks(),
      store.data.createFlushCacheTask(),
    ])
  }
}
