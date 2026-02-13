import { AppStore } from "./AppStore"
import { CurrencyStore } from "./CurrencyStore"
import { GoldStore } from "./GoldStore"
import { DIVIDEND_ARISTOCRATS, HIGH_YIELD, StocksStore } from "./StocksStore"
import { SymbolStore } from "./SymbolStore"
import { ThemeStore } from "./ThemeStore"

export class RootStore {
  constructor() {
    this.app = new AppStore(this)
    this.currency = new CurrencyStore(this)
    this.gold = new GoldStore(this)
    this.stocks = new StocksStore(this, DIVIDEND_ARISTOCRATS, "aristocrats")
    this.highYield = new StocksStore(this, HIGH_YIELD, "high-yield")
    this.theme = new ThemeStore(this)
    this.vt = new SymbolStore(this, "VT")
    this.voo = new SymbolStore(this, "VOO")
  }

  readonly app: AppStore
  readonly currency: CurrencyStore
  readonly gold: GoldStore
  readonly stocks: StocksStore
  readonly highYield: StocksStore
  readonly theme: ThemeStore
  readonly vt: SymbolStore
  readonly voo: SymbolStore
}
