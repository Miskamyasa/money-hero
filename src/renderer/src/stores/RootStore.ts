import { DIVIDEND_ARISTOCRATS, HIGH_YIELD, WATER } from "@renderer/config/stockUniverses"
import { AMOUNT_SCOPE_STOCK_HOLDINGS } from "../../../shared/amountScopes"

import { AppStore } from "./AppStore"
import { CurrencyStore } from "./CurrencyStore"
import { GoldStore } from "./GoldStore"
import { StockAmountsStore } from "./StockAmountsStore"
import { StocksStore } from "./StocksStore"
import { SymbolStore } from "./SymbolStore"
import { ThemeStore } from "./ThemeStore"

export class RootStore {
  constructor() {
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
  }

  readonly app: AppStore
  readonly currency: CurrencyStore
  readonly gold: GoldStore
  readonly stockAmounts: StockAmountsStore
  readonly stocks: StocksStore
  readonly highYield: StocksStore
  readonly water: StocksStore
  readonly theme: ThemeStore
  readonly vt: SymbolStore
  readonly voo: SymbolStore
}
