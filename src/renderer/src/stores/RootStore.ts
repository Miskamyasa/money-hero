import { AppStore } from "./AppStore"
import { GoldStore } from "./GoldStore"
import { StocksStore } from "./StocksStore"
import { ThemeStore } from "./ThemeStore"

export class RootStore {
  constructor() {
    this.app = new AppStore(this)
    this.gold = new GoldStore(this)
    this.stocks = new StocksStore(this)
    this.theme = new ThemeStore(this)
  }

  readonly app: AppStore
  readonly gold: GoldStore
  readonly stocks: StocksStore
  readonly theme: ThemeStore
}
