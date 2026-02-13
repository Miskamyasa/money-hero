import { AppStore } from "./AppStore"

export class RootStore {
  constructor() {
    this.app = new AppStore(this)
  }

  readonly app: AppStore
}
