import { AppStore } from "./AppStore"
import { GoldStore } from "./GoldStore"

export class RootStore {
  constructor() {
    this.app = new AppStore(this)
    this.gold = new GoldStore(this)
  }

  readonly app: AppStore
  readonly gold: GoldStore
}
